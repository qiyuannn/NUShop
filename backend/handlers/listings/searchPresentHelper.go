package listings

import (
	db "backend/database"
	"backend/models"
	"backend/response"
	"errors"
	"log"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func SearchPresentHelper(
	c *gin.Context,
	conditions []string,
	args []interface{},
	argsIndex int,
	search *string,
	limit int,
	cursorRank *float64,
	cursorID *string,
) ([]models.SearchListing, *response.Cursor) {
	if search == nil {
		c.Error(response.ErrInternalServerError(errors.New("wrong search helper used")))
		return nil, nil
	}

	log.Printf("full text search ran")
	//Postgres full text search
	sqlQuery :=
	`
	SELECT
	id,
	seller_id,
	title,
	description,
	price,
	quantity,
	condition,
	category_name,
	created_on,
	ts_rank(search_vector, websearch_to_tsquery('english', $` + strconv.Itoa(argsIndex) + `)) AS rank
	FROM listings
	`
	ftsConditions := conditions
	ftsConditions = append(ftsConditions, "search_vector @@ websearch_to_tsquery('english', $" + strconv.Itoa(argsIndex)+ ")")

	ftsArgs := args
	ftsArgs = append(ftsArgs, search)

	ftsIndex := argsIndex
	ftsIndex ++

	if len(ftsConditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(ftsConditions, " AND ")
	}

	finalQuery := `SELECT * FROM (` + sqlQuery + `) ranked`

	hasCursorRank := cursorRank != nil
	hasCursorID := cursorID != nil
	if hasCursorID != hasCursorRank {
		c.Error(response.ErrBadRequest(errors.New("invalid cursor")))
		return nil, nil
	}

	if hasCursorID && hasCursorRank {
		finalQuery += " WHERE (rank, id) < ($" + strconv.Itoa(ftsIndex)+ ",$" + strconv.Itoa(ftsIndex+1) + ")"
		ftsArgs = append(ftsArgs, cursorRank, cursorID)
		ftsIndex += 2
	}
	
	finalQuery += " ORDER BY ranked.rank DESC, ranked.id DESC"
	finalQuery += " LIMIT " + strconv.Itoa(limit+1)

	rows, err := db.Pool.Query(c.Request.Context(), finalQuery, ftsArgs...)
	if err != nil {
		c.Error(response.ErrInternalServerError(err))
		return nil, nil
	}
	defer rows.Close()

	listings := []models.SearchListing{}

	for rows.Next() {
		var l models.SearchListing
		if err := rows.Scan(
			&l.ID,
			&l.SellerID,
			&l.Title,
			&l.Description,
			&l.Price,
			&l.Quantity,
			&l.Condition,
			&l.CategoryName,
			&l.CreatedOn,
			&l.Rank,
		); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return nil, nil
		}
		listings = append(listings, l)
	}

	if err := rows.Err(); err != nil {
		c.Error(response.ErrInternalServerError(err))
		return nil, nil
	}

	//Trigram search (fallback)
	if len(listings) == 0 {
		log.Printf("trigram search ran")
		newQuery := `
		SELECT
		id,
		seller_id,
		title,
		description,
		price,
		quantity,
		condition,
		category_name,
		created_on,
		GREATEST (
			similarity(title, $` + strconv.Itoa(argsIndex) +`),
			word_similarity(description, $` + strconv.Itoa(argsIndex) +`),
			similarity(category_name, $` + strconv.Itoa(argsIndex) +`)
			) as rank
		FROM listings
		`
		conditions = append(conditions, `(title % $` + strconv.Itoa(argsIndex) +` OR category_name <% $` + strconv.Itoa(argsIndex) +` OR description % $` + strconv.Itoa(argsIndex) + ")")
		args = append(args, search)
		argsIndex ++

		if len(conditions) > 0 {
			newQuery += " WHERE " + strings.Join(conditions, " AND ")
		}

		newFinalQuery := `SELECT * FROM (` + newQuery +`) ranked`

		if hasCursorID && hasCursorRank {
			newFinalQuery += " WHERE (rank, id) < ($" + strconv.Itoa(argsIndex)+ ",$" + strconv.Itoa(argsIndex+1) + ")"
			args = append(args, cursorRank, cursorID)
			argsIndex += 2
		}

		newFinalQuery += " ORDER BY rank DESC, id DESC"
		newFinalQuery += " LIMIT " + strconv.Itoa(limit+1)

		rows, err := db.Pool.Query(c.Request.Context(), newQuery, args...)
		if err != nil {
			c.Error(response.ErrInternalServerError(err))
			return nil, nil
		}
		defer rows.Close()

		for rows.Next() {
			var l models.SearchListing
			if err := rows.Scan(
				&l.ID,
				&l.SellerID,
				&l.Title,
				&l.Description,
				&l.Price,
				&l.Quantity,
				&l.Condition,
				&l.CategoryName,
				&l.CreatedOn,
				&l.Rank,
			); err != nil {
				c.Error(response.ErrInternalServerError(err))
				return nil, nil
			}
			listings = append(listings, l)
		}

		if err := rows.Err(); err != nil {
			c.Error(response.ErrInternalServerError(err))
			return nil, nil
		}
	}

	hasMore := len(listings) > limit
	cursor := response.Cursor{HasMore: hasMore}

	if hasMore {
		listings = listings[:limit]
	}

	if len(listings) > 0 {
		last := listings[len(listings)-1]
		cursor.CursorID = &last.ID
		cursor.CursorRank = last.Rank
	}

	return listings, &cursor
}