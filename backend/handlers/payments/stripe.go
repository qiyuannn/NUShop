package payments

import (
	"backend/auth"
	db "backend/database"
	"backend/response"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type checkoutItem struct {
	ListingID   string
	Title       string
	Description string
	Price       int64
	Quantity    int
}

type stripeEvent struct {
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

type completedSession struct {
	ID       string            `json:"id"`
	Metadata map[string]string `json:"metadata"`
}

func CreateStripeCheckoutSession(c *gin.Context) {
	userIDValue, ok := c.Get("userID")
	if !ok {
		c.Error(response.ErrUnauthorised(errors.New("user not logged in")))
		return
	}

	userIDStr, ok := userIDValue.(string)
	if !ok {
		c.Error(response.ErrInternalServerError(errors.New("invalid auth context")))
		return
	}

	if _, err := uuid.Parse(userIDStr); err != nil {
		c.Error(response.ErrUnauthorised(err))
		return
	}

	items, appErr := getCheckoutItems(c.Request.Context(), userIDStr)
	if appErr != nil {
		c.Error(appErr)
		return
	}

	if len(items) == 0 {
		c.Error(response.ErrBadRequest(errors.New("cart is empty")))
		return
	}

	secretKey := os.Getenv("STRIPE_SECRET_KEY")
	if secretKey == "" {
		c.Error(response.ErrInternalServerError(errors.New("STRIPE_SECRET_KEY is missing")))
		return
	}

	frontendURL := strings.TrimRight(os.Getenv("FRONTEND_URL"), "/")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("success_url", frontendURL+"/cart?payment=success")
	form.Set("cancel_url", frontendURL+"/cart?payment=canceled")
	form.Set("client_reference_id", userIDStr)
	form.Set("metadata[user_id]", userIDStr)

	for i, item := range items {
		prefix := fmt.Sprintf("line_items[%d]", i)
		form.Set(prefix+"[quantity]", strconv.Itoa(item.Quantity))
		form.Set(prefix+"[price_data][currency]", "usd")
		form.Set(prefix+"[price_data][unit_amount]", strconv.FormatInt(item.Price*100, 10))
		form.Set(prefix+"[price_data][product_data][name]", item.Title)

		if item.Description != "" {
			form.Set(prefix+"[price_data][product_data][description]", item.Description)
		}

		form.Set(prefix+"[price_data][product_data][metadata][listing_id]", item.ListingID)
	}

	req, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodPost,
		"https://api.stripe.com/v1/checkout/sessions",
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	req.Header.Set("Authorization", "Bearer "+secretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 20 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		c.Error(response.ErrInternalServerError(fmt.Errorf("stripe checkout session error: %s", strings.TrimSpace(string(body)))))
		return
	}

	var stripeResp struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.Unmarshal(body, &stripeResp); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return
	}

	if stripeResp.URL == "" {
		c.Error(response.ErrInternalServerError(errors.New("stripe did not return a checkout url")))
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"url":       stripeResp.URL,
		"sessionId": stripeResp.ID,
	})
}

func HandleStripeWebhook(c *gin.Context) {
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		c.Error(response.ErrInternalServerError(errors.New("STRIPE_WEBHOOK_SECRET is missing")))
		return
	}

	payload, err := c.GetRawData()
	if err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	if err := verifyStripeSignature(payload, c.GetHeader("Stripe-Signature"), webhookSecret, 5*time.Minute); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	var event stripeEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		c.Error(response.ErrBadRequest(err))
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session completedSession
		if err := json.Unmarshal(event.Data.Object, &session); err != nil {
			c.Error(response.ErrBadRequest(err))
			return
		}

		userID := session.Metadata["user_id"]
		if userID == "" {
			c.Status(http.StatusOK)
			return
		}

		items, appErr := getCheckoutItems(c.Request.Context(), userID)
		if appErr != nil {
			c.Error(appErr)
			return
		}

		if _, err := db.Pool.Exec(c.Request.Context(), `DELETE FROM cart WHERE user_id = $1`, userID); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return
		}

		if len(items) > 0 {
			email, err := getUserEmail(c.Request.Context(), userID)
			if err != nil {
				log.Printf("payment confirmation email skipped for user %s: %v", userID, err)
			} else {
				go func(to string, purchasedItems []checkoutItem) {
					if err := sendPaymentConfirmationEmail(to, purchasedItems); err != nil {
						log.Printf("payment confirmation email failed for %s: %v", to, err)
					}
				}(email, items)
			}
		}
	}

	c.Status(http.StatusOK)
}

func getUserEmail(ctx context.Context, userID string) (string, error) {
	var email string
	if err := db.Pool.QueryRow(
		ctx,
		`SELECT email
		 FROM users
		 WHERE id = $1`,
		userID,
	).Scan(&email); err != nil {
		return "", err
	}

	return email, nil
}

func sendPaymentConfirmationEmail(to string, items []checkoutItem) error {
	total := int64(0)
	lines := make([]string, 0, len(items))

	for _, item := range items {
		subtotal := item.Price * int64(item.Quantity)
		total += subtotal
		lines = append(lines, fmt.Sprintf("- %s x%d: $%d", item.Title, item.Quantity, subtotal))
	}

	body := "Hello,\r\n\r\nWe received your payment successfully.\r\n\r\nOrder summary:\r\n"
	if len(lines) > 0 {
		body += strings.Join(lines, "\r\n") + "\r\n"
	}
	body += fmt.Sprintf("\r\nTotal: $%d\r\n\r\nYour cart has been cleared after checkout.\r\n\r\nNUShop Team", total)

	return auth.SendEmail(to, "Payment successful on NUShop", body)
}

func getCheckoutItems(ctx context.Context, userID string) ([]checkoutItem, *response.AppError) {
	rows, err := db.Pool.Query(
		ctx,
		`SELECT listing_id, quantity
		 FROM cart
		 WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return nil, response.ErrInternalServerError(err)
	}
	defer rows.Close()

	listingIDs := make([]string, 0)
	qtyMap := map[string]int{}

	for rows.Next() {
		var listingID string
		var qty int
		if err := rows.Scan(&listingID, &qty); err != nil {
			return nil, response.ErrInternalServerError(err)
		}
		listingIDs = append(listingIDs, listingID)
		qtyMap[listingID] = qty
	}

	if err := rows.Err(); err != nil {
		return nil, response.ErrInternalServerError(err)
	}

	if len(listingIDs) == 0 {
		return []checkoutItem{}, nil
	}

	placeholders := make([]string, 0, len(listingIDs))
	args := make([]any, 0, len(listingIDs))
	for i, id := range listingIDs {
		placeholders = append(placeholders, "$"+strconv.Itoa(i+1))
		args = append(args, id)
	}

	query := `
		SELECT id, title, description, price
		FROM listings
		WHERE id IN (` + strings.Join(placeholders, ",") + `)
	`

	listingRows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, response.ErrInternalServerError(err)
	}
	defer listingRows.Close()

	listingMap := map[string]checkoutItem{}
	for listingRows.Next() {
		var item checkoutItem
		if err := listingRows.Scan(&item.ListingID, &item.Title, &item.Description, &item.Price); err != nil {
			return nil, response.ErrInternalServerError(err)
		}
		listingMap[item.ListingID] = item
	}

	if err := listingRows.Err(); err != nil {
		return nil, response.ErrInternalServerError(err)
	}

	items := make([]checkoutItem, 0, len(listingIDs))
	for _, id := range listingIDs {
		item, ok := listingMap[id]
		if !ok {
			return nil, response.ErrNotFound(errors.New("one or more cart items no longer exist"))
		}
		item.Quantity = qtyMap[id]
		items = append(items, item)
	}

	return items, nil
}

func verifyStripeSignature(payload []byte, signatureHeader, secret string, tolerance time.Duration) error {
	if signatureHeader == "" {
		return errors.New("missing Stripe-Signature header")
	}

	var timestamp int64
	signatures := make([]string, 0, 2)

	for _, part := range strings.Split(signatureHeader, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}

		switch kv[0] {
		case "t":
			ts, err := strconv.ParseInt(kv[1], 10, 64)
			if err != nil {
				return errors.New("invalid Stripe-Signature timestamp")
			}
			timestamp = ts
		case "v1":
			signatures = append(signatures, kv[1])
		}
	}

	if timestamp == 0 || len(signatures) == 0 {
		return errors.New("invalid Stripe-Signature header")
	}

	signedAt := time.Unix(timestamp, 0)
	diff := time.Since(signedAt)
	if diff < 0 {
		diff = -diff
	}
	if diff > tolerance {
		return errors.New("Stripe-Signature timestamp outside tolerance")
	}

	signedPayload := fmt.Sprintf("%d.%s", timestamp, payload)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(signedPayload))
	expected := mac.Sum(nil)

	for _, sig := range signatures {
		actual, err := hex.DecodeString(sig)
		if err != nil {
			continue
		}
		if hmac.Equal(expected, actual) {
			return nil
		}
	}

	return errors.New("invalid Stripe signature")
}
