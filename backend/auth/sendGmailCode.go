package auth

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
)

func sendGmailCode(to string, code string) error {
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

	conn, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := conn.Hello("localhost"); err != nil {
		return err
	}

	if ok, _ := conn.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName: host,
			MinVersion: tls.VersionTLS12,
		}
		if err := conn.StartTLS(tlsConfig); err != nil {
			return err
		}
	}

	auth := smtp.PlainAuth("", from, pass, host)
	if err := conn.Auth(auth); err != nil {
		return err
	}

	if err := conn.Mail(from); err != nil {
		return err
	}
	if err := conn.Rcpt(to); err != nil {
		return err
	}

	w, err := conn.Data()
	if err != nil {
		return err
	}
	defer w.Close()

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

	_, err = fmt.Fprint(w, msg)
	return err
}
