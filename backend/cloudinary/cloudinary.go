package cloudinary

import (
	"context"
	"mime/multipart"
	"os"

	cld "github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type UploadResult struct {
	URL      string
	PublicID string
}

func UploadImage(file multipart.File) (*UploadResult, error) {
	cloud, err := cld.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		return nil, err
	}

	result, err := cloud.Upload.Upload(
		context.Background(),
		file,
		uploader.UploadParams{Folder: "orbital-listings"},
	)
	if err != nil {
		return nil, err
	}

	return &UploadResult{
		URL:      result.SecureURL,
		PublicID: result.PublicID,
	}, nil
}
func DeleteImage(publicID string) error {
	cloud, err := cld.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		return err
	}
	_, err = cloud.Upload.Destroy(
		context.Background(),
		uploader.DestroyParams{PublicID: publicID},
	)
	return err
}
