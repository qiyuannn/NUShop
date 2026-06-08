package cloudinary

import (
	"context"
	"mime/multipart"
	"os"

	cld "github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

func UploadImage(file multipart.File) (string, error) {
	cloud, err := cld.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		return "", err
	}

	result, err := cloud.Upload.Upload(
		context.Background(),
		file,
		uploader.UploadParams{Folder: "orbital-listings"},
	)
	if err != nil {
		return "", err
	}

	return result.SecureURL, nil
}