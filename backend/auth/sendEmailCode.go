package auth

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

func sendEmailCode(to string, code string) error {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		host = "smtp.gmail.com"
	}

	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}

	from := os.Getenv("SMTP_EMAIL")
	pass := os.Getenv("SMTP_APP_PASSWORD")
	displayFrom := os.Getenv("EMAIL_FROM")
	if displayFrom == "" {
		displayFrom = fmt.Sprintf("NUShop <%s>", from)
	}

	if from == "" || pass == "" {
		return fmt.Errorf("SMTP_EMAIL or SMTP_APP_PASSWORD not set")
	}

	addr := net.JoinHostPort(host, port)

	dialer := net.Dialer{Timeout: 10 * time.Second}
	rawConn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("smtp dial %s: %w", addr, err)
	}
	defer rawConn.Close()

	conn, err := smtp.NewClient(rawConn, host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer conn.Close()

	if err := conn.Hello("localhost"); err != nil {
		return fmt.Errorf("smtp hello: %w", err)
	}

	if ok, _ := conn.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName: host,
			MinVersion: tls.VersionTLS12,
		}
		if err := conn.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("smtp starttls: %w", err)
		}
	}

	auth := smtp.PlainAuth("", from, pass, host)
	if err := conn.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}

	if err := conn.Mail(from); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := conn.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}

	w, err := conn.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}

	subject := "Your NUShop Verification Code"
	body := fmt.Sprintf(
		"Hello,\r\n\r\nYour NUShop verification code is: %s\r\n\r\nThis code expires in 10 minutes.\r\n\r\nIf you did not request this code, you can safely ignore this email.\r\n\r\nNUShop Team",
		code,
	)

	msg := strings.Join([]string{
		fmt.Sprintf("From: %s", displayFrom),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		`Content-Type: text/plain; charset="UTF-8"`,
		"",
		body,
	}, "\r\n")

	if _, err := fmt.Fprint(w, msg); err != nil {
		_ = w.Close()
		return fmt.Errorf("smtp write message: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close data: %w", err)
	}

	return nil
}