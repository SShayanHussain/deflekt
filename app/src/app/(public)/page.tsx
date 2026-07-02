import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden py-24 lg:py-32 bg-background flex justify-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply opacity-70 animate-pulse"></div>
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent/30 blur-[100px] mix-blend-multiply opacity-50"></div>
        </div>

        <div className="container max-w-5xl px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-muted/30 backdrop-blur-sm border-border text-primary shadow-sm">
              <span className="flex w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Introducing Deflekt 1.0 — Smarter Support
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 max-w-4xl">
              Answer the tickets you <br className="hidden sm:block" /> shouldn&apos;t have to.
            </h1>
            
            <p className="max-w-[700px] text-lg md:text-xl text-muted-foreground">
              Connect your knowledge base and let Deflekt automatically answer repetitive customer questions with cited, highly-confident responses.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-base")}>
                Start Deflecting for Free
              </Link>
              <Link href="/pricing" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 rounded-full border-border bg-background/50 backdrop-blur-sm hover:bg-muted text-base transition-all hover:scale-105 active:scale-95")}>
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 bg-muted/30 border-y border-border/50 flex justify-center">
        <div className="container max-w-6xl px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to scale support</h2>
            <p className="mt-4 text-muted-foreground text-lg">No more copy-pasting from docs. Give your users instant, accurate answers.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="m9 10 2 2 4-4"></path></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">Grounded & Cited</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every answer includes a direct citation to your documentation. No hallucinations, just facts from your connected sources.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">Confidence Gated</h3>
              <p className="text-muted-foreground leading-relaxed">
                If the AI isn&apos;t absolutely sure, it seamlessly escalates the conversation to a human agent without frustrating the user.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">Insightful Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track your deflection rate, view top unanswered questions, and identify exactly what docs you need to write next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 flex justify-center">
        <div className="container max-w-4xl px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Ready to reduce your ticket volume?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">Join product teams using Deflekt to provide instant support while saving hours of agent time every week.</p>
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-14 px-10 rounded-full text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95")}>
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}
