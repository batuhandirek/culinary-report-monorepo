export interface SendEmailInputDto {
	subject: string;
	html: string;
	// The same mail for clients that show no HTML; a multipart mail also reads less like spam.
	text?: string;
	// `email` is absent on an account opened with a phone number: nothing is queued then.
	to: { name?: string; email?: string | null };
}
