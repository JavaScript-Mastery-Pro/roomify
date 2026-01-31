import React, { useRef } from "react";
import {
  ArrowRight,
  Clock,
  ArrowUpRight,
  Box,
  Shield,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "./ui/Button";
import Upload from "./Upload";

const Landing: React.FC<LandingProps> = ({
  onStart,
  history,
  onSelectHistory,
  onSelectPublic,
  onSignIn,
  isLoadingHistory,
  publicProjects,
  isLoadingPublic,
}) => {
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const hasHistory = history.length > 0;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/90 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2 cursor-pointer">
              <Box className="w-6 h-6 text-black" strokeWidth={2.5} />
              <span className="text-xl font-serif font-bold text-black tracking-tight">
                Roomify
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="#"
                className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
              >
                Product
              </a>
              <a
                href="#"
                className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
              >
                Pricing
              </a>
              <a
                href="#"
                className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
              >
                Community
              </a>
              <a
                href="#"
                className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
              >
                Enterprise
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onSignIn}
              className="text-xs font-bold uppercase tracking-wide text-zinc-900 hover:text-primary transition-colors"
            >
              Log In
            </button>
            <Button size="sm" onClick={scrollToUpload} className="rounded-md">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center px-3 py-1 rounded-md bg-white border border-zinc-200 shadow-sm">
          <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center mr-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Introducing Roomify 2.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl font-serif leading-[0.95] text-black mb-8 max-w-5xl mx-auto">
          Build beautiful spaces at the speed of thought with Roomify_
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-xs md:text-sm font-mono uppercase tracking-widest text-zinc-500 mb-10 leading-relaxed">
          Roomify is an AI-first design environment that helps you visualize,
          render, and ship architectural projects faster than ever.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            size="lg"
            onClick={scrollToUpload}
            className="px-8 bg-[#F97316] hover:bg-[#ea580c] text-white border-none rounded-md shadow-md"
          >
            Start Building <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 bg-white rounded-md hover:bg-zinc-50"
          >
            Watch Demo
          </Button>
        </div>

        {/* Hero Visual / Upload Box */}
        <div
          ref={uploadRef}
          className="w-full max-w-5xl mx-auto relative rounded-3xl overflow-hidden bg-gradient-to-b from-blue-100/50 to-white/50 border border-blue-100 p-6 md:p-12 shadow-sm min-h-[400px] flex items-center justify-center"
        >
          {/* Grid overlay for texture */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          ></div>

          {/* The Upload Component Container - Clean, White, Modern */}
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-100 p-8 z-10 transition-transform hover:scale-[1.01] duration-500">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Layers className="text-orange-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-black">
                Upload your floor plan
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Supports JPG, PNG formats up to 10MB
              </p>
            </div>

            <Upload onComplete={onStart} />
          </div>
        </div>
      </section>

      {/* Your Projects Section */}
      <section className="py-24 bg-white relative border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-serif text-black mb-4">
                Your Projects
              </h2>
              <p className="text-zinc-500 text-lg">
                Pick up where you left off. Select a project to continue
                refining your visualization.
              </p>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center text-sm text-zinc-500">
              Loading your projects…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hasHistory ? (
                history.map((item, index) => (
                  <div
                    key={item.id || `${item.timestamp}-${index}`}
                    onClick={() => onSelectHistory(item.id)}
                    className="group relative bg-white rounded-xl overflow-hidden border border-zinc-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-zinc-100 relative">
                      <img
                        src={item.renderedImage || item.sourceImage}
                        alt={`Project ${history.length - index}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-200 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                          {index === 0
                            ? "Latest Edit"
                            : `Version ${history.length - index}`}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex justify-between items-center bg-white border-t border-zinc-100 flex-grow">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-zinc-900 group-hover:text-primary transition-colors">
                          Residence {history.length - index}
                        </h3>
                        <div className="flex items-center text-zinc-400 text-xs mt-1 space-x-2">
                          <Clock size={12} />
                          <span className="font-mono uppercase">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
                  No projects yet. Upload a floor plan to create your first one.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-24 bg-white relative border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-serif text-black mb-4">
                Community Projects
              </h2>
              <p className="text-zinc-500 text-lg">
                Explore shared projects from the Roomify community.
              </p>
            </div>
          </div>

          {isLoadingPublic ? (
            <div className="flex items-center justify-center text-sm text-zinc-500">
              Loading community projects…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publicProjects.length > 0 ? (
                publicProjects.map((item, index) => (
                  <div
                    key={`public-${item.id || `${item.timestamp}-${index}`}`}
                    onClick={() => onSelectPublic(item)}
                    className="group relative bg-white rounded-xl overflow-hidden border border-zinc-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-zinc-100 relative">
                      <img
                        src={item.renderedImage || item.sourceImage}
                        alt={`Community Project ${publicProjects.length - index}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-200 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                          Shared
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex justify-between items-center bg-white border-t border-zinc-100 flex-grow">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-zinc-900 group-hover:text-primary transition-colors">
                          Community Render {publicProjects.length - index}
                        </h3>
                        <div className="flex items-center text-zinc-400 text-xs mt-1 space-x-2">
                          <Clock size={12} />
                          <span className="font-mono uppercase">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
                  No shared projects yet. Click Share in the editor to publish
                  yours.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Logos Section */}
      <section className="border-t border-zinc-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <LogoPlaceholder text="Delve" icon={<Layers />} />
            <LogoPlaceholder text="Loops" icon={<RefreshCwIcon />} />
            <LogoPlaceholder text="Vanta" icon={<Shield />} />
            <LogoPlaceholder text="Greptile" icon={<Zap />} />
            <LogoPlaceholder text="Mixpanel" icon={<Box />} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <Box className="w-5 h-5 text-zinc-900" />
            <span className="text-lg font-serif font-bold text-black">
              Roomify
            </span>
            <span className="text-zinc-400 text-xs ml-2 font-mono">
              © 2024 INC.
            </span>
          </div>
          <div className="flex space-x-8">
            <FooterLink href="#" label="Privacy" />
            <FooterLink href="#" label="Terms" />
            <FooterLink href="#" label="Contact" />
            <FooterLink href="#" label="Twitter" />
          </div>
        </div>
      </footer>
    </div>
  );
};

const LogoPlaceholder = ({
  text,
  icon,
}: {
  text: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center justify-center space-x-2 group cursor-pointer">
    <div className="text-zinc-800 group-hover:text-black transition-colors">
      {icon}
    </div>
    <span className="font-bold text-xl text-zinc-800 group-hover:text-black transition-colors tracking-tight">
      {text}
    </span>
  </div>
);

const RefreshCwIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const FooterLink = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    className="text-zinc-500 hover:text-black transition-colors text-xs font-bold uppercase tracking-wide"
  >
    {label}
  </a>
);

export default Landing;
