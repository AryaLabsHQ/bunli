import { 
  Zap, 
  Shield,
  Package,
  Sparkles,
  TestTube2,
  Rocket
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Blazing Fast',
    description: 'Powered by Bun\'s native speed'
  },
  {
    icon: Shield,
    title: 'Type-Safe',
    description: 'Full TypeScript autocompletion'
  },
  {
    icon: Package,
    title: 'Zero Config',
    description: 'Works out of the box, sensible defaults'
  },
  {
    icon: Sparkles,
    title: 'Minimal API',
    description: 'Learn once, use everywhere'
  },
  {
    icon: TestTube2,
    title: 'Testing Built-in',
    description: 'First-class testing utilities included'
  },
  {
    icon: Rocket,
    title: 'Easy Deploy',
    description: 'Compile to single executable'
  }
];

export function FeaturesGrid() {
  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Simple, powerful, and ready for production
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative rounded-lg border bg-card p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}