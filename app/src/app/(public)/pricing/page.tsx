import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center py-20">
      <div className="container max-w-5xl px-4 md:px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start for free, upgrade when you need to scale your support deflection.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Free Tier */}
          <Card className="flex flex-col h-full border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for testing out Deflekt</CardDescription>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                $0
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">1 Document Source</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">100 answers / month</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Standard Widget Theme</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground opacity-50">
                  <div className="rounded-full bg-muted p-1"><Check className="h-4 w-4" /></div>
                  <span className="text-sm">Analytics</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className="flex flex-col h-full border-primary shadow-lg relative transform md:-translate-y-4">
            <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-primary px-3 py-1 text-center text-xs font-medium text-primary-foreground shadow-sm">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Pro</CardTitle>
              <CardDescription>For growing product teams</CardDescription>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                $49
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm font-medium">Unlimited Sources</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm font-medium">5,000 answers / month</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Custom Widget Theme</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Basic Analytics</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full shadow-md transition-transform hover:scale-105 active:scale-95">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Team Tier */}
          <Card className="flex flex-col h-full border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Team</CardTitle>
              <CardDescription>Advanced tools & scale</CardDescription>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                $199
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Unlimited answers</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm">SSO / SAML Support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <Link href="/signup">Contact Sales</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
