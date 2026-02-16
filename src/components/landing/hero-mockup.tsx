"use client";

import { motion } from "framer-motion";
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  TrendingUp,
  Package,
  Activity
} from "lucide-react";

export function HeroMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto mt-12 perspective-1000">
      <motion.div 
        initial={{ rotateX: 10, y: 40, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-card border rounded-xl shadow-2xl overflow-hidden shadow-primary/10"
      >
        {/* Browser Chrome */}
        <div className="bg-muted/50 border-b px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="ml-4 bg-background/50 rounded-md px-3 py-1 text-xs text-muted-foreground w-64 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary/20" />
            supplypulse.net/dashboard
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 bg-background grid grid-cols-3 gap-6">
          {/* Sidebar (Mock) */}
          <div className="col-span-1 hidden md:block space-y-4 border-r pr-6">
            <div className="h-8 w-8 rounded-lg bg-primary mb-6" />
            <div className="space-y-2">
              <div className="h-8 bg-primary/10 rounded-md w-full" />
              <div className="h-8 hover:bg-muted rounded-md w-full" />
              <div className="h-8 hover:bg-muted rounded-md w-full" />
              <div className="h-8 hover:bg-muted rounded-md w-full" />
            </div>
            
            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-bold">Risk Alert</span>
              </div>
              <div className="h-2 bg-amber-200 rounded w-3/4" />
              <div className="h-2 bg-amber-200 rounded w-1/2 mt-2" />
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-3 md:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 w-32 bg-foreground/10 rounded mb-2" />
                <div className="h-4 w-48 bg-muted-foreground/10 rounded" />
              </div>
              <div className="h-9 w-24 bg-primary rounded shadow-sm" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Monitored Suppliers", val: "142", icon: Package, color: "text-blue-500" },
                { label: "Active Risks", val: "3", icon: AlertTriangle, color: "text-amber-500" },
                { label: "Risk Score", val: "Low", icon: Activity, color: "text-green-500" },
              ].map((stat, i) => (
                <div key={i} className="p-4 border rounded-lg bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{stat.val}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="border rounded-lg p-4 h-48 bg-muted/5 relative overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-between px-6 pb-6 pt-12 gap-2">
                {[40, 65, 45, 80, 55, 70, 60, 90, 75, 50, 65, 85].map((h, i) => (
                  <div 
                    key={i} 
                    className="w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-colors"
                    style={{ height: `${h}%` }} 
                  />
                ))}
              </div>
              <div className="absolute top-4 left-4 flex gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Supply Chain Volatility
                </div>
              </div>
            </div>

            {/* Recent Alerts Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground flex justify-between">
                <span>Recent Alerts</span>
                <span>Status</span>
              </div>
              {[
                { text: "Port Congestion: Shanghai", time: "2h ago", status: "Critical" },
                { text: "Labor Strike: Germany", time: "5h ago", status: "Warning" },
                { text: "Supplier Bankruptcy: TechComponents", time: "1d ago", status: "Resolved" },
              ].map((row, i) => (
                <div key={i} className="px-4 py-3 border-b last:border-0 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{row.text}</span>
                  </div>
                  <Badge variant={row.status === "Critical" ? "destructive" : row.status === "Warning" ? "outline" : "secondary"}>
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent h-full w-full pointer-events-none" />
      </motion.div>
      
      {/* Background Glow */}
      <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 rounded-[3rem] opacity-50" />
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: string }) {
  const styles = {
    destructive: "bg-red-100 text-red-700 border-red-200",
    outline: "bg-amber-50 text-amber-700 border-amber-200",
    secondary: "bg-green-50 text-green-700 border-green-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[variant as keyof typeof styles]}`}>
      {children}
    </span>
  );
}
