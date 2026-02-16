"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureSectionProps {
  title: string;
  description: string;
  points: string[];
  icon: LucideIcon;
  imageSide: "left" | "right";
  children: React.ReactNode; // For the visual/mockup part
}

export function FeatureSection({ title, description, points, icon: Icon, imageSide, children }: FeatureSectionProps) {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "flex flex-col lg:flex-row items-center gap-16",
          imageSide === "right" ? "lg:flex-row" : "lg:flex-row-reverse"
        )}>
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: imageSide === "right" ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex-1 space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Icon className="h-4 w-4" />
              <span>Feature Highlight</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
            
            <ul className="space-y-4">
              {points.map((point, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="h-3.5 w-3.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-foreground font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Visual Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/5">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[18px] blur-sm -z-10" />
              <div className="bg-background rounded-xl overflow-hidden">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
