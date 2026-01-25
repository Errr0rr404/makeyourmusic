import { Building, Code, Cpu, Feather, Gem, GitBranch, HeartHandshake, Layers, Lightbulb, Rocket, ShieldCheck } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Kairux',
  description: 'Learn more about Kairux, our features, and our mission to streamline business operations.',
};

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-12 sm:py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">About Kairux</h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            We are dedicated to empowering businesses by simplifying complexity and fostering growth through a unified, AI-powered platform.
          </p>
        </section>

        {/* What is Kairux? */}
        <section id="what-is-kairux" className="mb-16 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
              <Lightbulb className="w-8 h-8 text-primary" />
              What is Kairux?
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground text-justify">
              <p>
                Kairux is an all-in-one, AI-powered Cloud ERP (Enterprise Resource Planning) system designed for small and medium-sized businesses. Our mission is to break down silos and bring harmony to your operations. We provide a single, unified platform where all your core business functions—from customer relationships to financial accounting—work together seamlessly.
              </p>
              <p>
                In a world where business is more interconnected than ever, managing disparate systems can be a significant drain on time and resources. Kairux eliminates this friction, creating a "flow state" for your business where information is readily available, processes are automated, and decisions are data-driven.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mb-16 scroll-mt-20">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <Gem className="w-8 h-8 text-primary" />
            Features We Offer
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureItem
              icon={<HeartHandshake className="w-7 h-7" />}
              title="CRM & Sales"
              description="Build lasting customer relationships. Track leads, manage pipelines, and close deals faster."
            />
            <FeatureItem
              icon={<Layers className="w-7 h-7" />}
              title="Comprehensive Accounting"
              description="From invoicing to financial statements, manage your company's finances with precision and ease."
            />
            <FeatureItem
              icon={<Building className="w-7 h-7" />}
              title="Human Resources"
              description="Streamline your HR processes, including employee data, payroll, and performance management."
            />
            <FeatureItem
              icon={<GitBranch className="w-7 h-7" />}
              title="Inventory Management"
              description="Optimize stock levels, manage purchase orders, and track inventory movement in real-time."
            />
            <FeatureItem
              icon={<Rocket className="w-7 h-7" />}
              title="Project Management"
              description="Plan, execute, and monitor projects. Collaborate with your team and keep everything on schedule."
            />
            <FeatureItem
              icon={<ShieldCheck className="w-7 h-7" />}
              title="And Much More"
              description="Kairux is an ever-evolving platform with modules for manufacturing, analytics, and more."
            />
          </div>
        </section>

        {/* Technical Features */}
        <section id="technical-features" className="mb-16 scroll-mt-20">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <Cpu className="w-8 h-8 text-primary" />
            Technical Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <TechFeatureItem title="AI-Powered Insights" description="Leverage artificial intelligence for demand forecasting, financial analysis, and process optimization." />
            <TechFeatureItem title="Cloud-Native" description="Access Kairux from anywhere, on any device. Our platform is built for reliability, scalability, and security." />
            <TechFeatureItem title="Modular Architecture" description="Start with what you need and add modules as your business grows. Kairux adapts to your requirements." />
            <TechFeatureItem title="Robust Security" description="Your data is protected with industry-leading security practices, including encryption and regular audits." />
          </div>
        </section>

        {/* Tech Stack */}
        <section id="tech-stack" className="mb-16 scroll-mt-20">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <Code className="w-8 h-8 text-primary" />
            Our Tech Stack
          </h2>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-muted-foreground mb-6">
              We use modern, robust, and scalable technologies to deliver a high-quality experience.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4">
              <TechBadge>Next.js</TechBadge>
              <TechBadge>React</TechBadge>
              <TechBadge>TypeScript</TechBadge>
              <TechBadge>Node.js</TechBadge>
              <TechBadge>PostgreSQL</TechBadge>
              <TechBadge>Prisma</TechBadge>
              <TechBadge>Tailwind CSS</TechBadge>
              <TechBadge>Docker</TechBadge>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We're here to help. Contact us to learn more about how Kairux can transform your business.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90">
              Contact Us
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow text-center">
      <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function TechFeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card">
      <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
        <Feather className="w-5 h-5 text-primary" />
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm font-medium">
      {children}
    </span>
  );
}
