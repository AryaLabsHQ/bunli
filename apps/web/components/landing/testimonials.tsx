import { Card } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "Bunli made building our internal CLI tools a breeze. The TypeScript support is fantastic!",
    author: "Sarah Chen",
    role: "Senior Developer",
    company: "TechCorp",
  },
  {
    quote: "Finally, a CLI framework that doesn't get in the way. Simple, fast, and just works.",
    author: "Alex Rivera",
    role: "DevOps Engineer",
    company: "CloudScale",
  },
  {
    quote: "The testing utilities alone are worth it. We've cut our CLI development time in half.",
    author: "Jordan Kim",
    role: "Tech Lead",
    company: "StartupXYZ",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/30 px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Loved by Developers</h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Join hundreds of developers building better CLIs
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6">
              <blockquote className="space-y-4">
                <p className="text-muted-foreground text-sm leading-7">"{testimonial.quote}"</p>
                <footer className="mt-4">
                  <p className="text-sm font-semibold">{testimonial.author}</p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </footer>
              </blockquote>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
