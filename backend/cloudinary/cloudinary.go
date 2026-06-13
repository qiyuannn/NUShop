package cloudinary

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
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

	compressedFile, err := compressImage(file)
	if err != nil {
		return nil, err
	}

	result, err := cloud.Upload.Upload(
		context.Background(),
		compressedFile,
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

func compressImage(file multipart.File) (*bytes.Reader, error) {
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer

	switch format {
	case "jpeg", "jpg":
		err = jpeg.Encode(&buf, img, &jpeg.Options{
			Quality: 85,
		})
	case "png":
		encoder := png.Encoder{
			CompressionLevel: png.BestCompression,
		}
		err = encoder.Encode(&buf, img)
	default:
		return nil, fmt.Errorf("unsupported image format: %s", format)
	}

	if err != nil {
		return nil, err
	}

	return bytes.NewReader(buf.Bytes()), nil
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
