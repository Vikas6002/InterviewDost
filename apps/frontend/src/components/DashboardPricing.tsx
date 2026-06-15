import { useState } from "react";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular: boolean;
}

const plans: Plan[] = [
  { id: "free", name: "Free", credits: 50, price: 0, popular: false },
  { id: "starter", name: "Starter", credits: 500, price: 499, popular: true },
  { id: "unlimited", name: "Unlimited", credits: -1, price: 2999, popular: false },
];

const features: Record<string, string[]> = {
  free: ["50 free credits", "GitHub interviews (5 credits)", "Resume interviews (10 credits)", "Basic analytics"],
  starter: ["500 credits", "GitHub interviews (5 credits)", "Resume interviews (10 credits)", "Full analytics & insights", "Priority support"],
  unlimited: ["Unlimited interviews", "No credit usage", "Full analytics & insights", "Priority support", "Skill radar reports", "Everything unlocked"],
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function DashboardPricing() {
  const { token } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(plan: Plan) {
    if (plan.price === 0) return;
    setLoading(plan.id);

    try {
      const orderRes = await fetch(`${BACKEND_URL}/api/v1/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: plan.id }),
      });

      if (!orderRes.ok) throw new Error("Failed to create order");
      const order = await orderRes.json();
      const rzpKey = order.key;

      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: "INR",
        name: "InterviewDost",
        description: `${plan.name} Plan`,
        order_id: order.orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch(`${BACKEND_URL}/api/v1/payments/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) throw new Error("Verification failed");
          window.location.reload();
        },
        modal: { ondismiss: () => setLoading(null) },
        prefill: { contact: "", email: "" },
        theme: { color: "#7c3aed" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => setLoading(null));
      rzp.open();
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Every interview costs credits. GitHub interviews use <span className="text-foreground font-medium">5 credits</span>, 
            resume interviews use <span className="text-foreground font-medium">10 credits</span>. 
            Pick a plan and start practicing.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col border bg-card/50 transition-colors rounded-none",
                plan.popular
                  ? "border-primary"
                  : "border-border",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold tracking-tight">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {plan.id === "unlimited" ? "/month" : " one-time"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.credits === -1 ? "Unlimited interviews" : `${plan.credits} credits total`}
                </p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col pb-6">
                <ul className="mb-8 space-y-2.5 text-sm">
                  {(features[plan.id] ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    className="w-full gap-2"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={loading === plan.id || plan.price === 0}
                    onClick={() => handlePurchase(plan)}
                  >
                    {loading === plan.id ? (
                      <><Loader2 className="size-4 animate-spin" /> Processing...</>
                    ) : plan.price === 0 ? (
                      "Current plan"
                    ) : (
                      <><Sparkles className="size-4" /> Buy {plan.name}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
