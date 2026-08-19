import { z } from "zod"

export const paymentCurrencySchema = z.object({
  paymentCurrency: z.enum(["NGN", "USD"], { error: "Select which currency you paid in" }),
})
export type PaymentCurrencyInput = z.infer<typeof paymentCurrencySchema>
