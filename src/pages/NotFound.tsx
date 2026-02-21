import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Rocket } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="max-w-sm w-full p-8 text-center space-y-5">
          <div className="text-5xl">🧵</div>
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This listing seems to have sold — or the URL is wrong.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button onClick={() => navigate("/dashboard")} className="w-full h-11 font-semibold">
              <Home className="w-4 h-4 mr-2" /> Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/sell")}
              className="w-full h-11 font-semibold"
            >
              <Rocket className="w-4 h-4 mr-2" /> List a New Item
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
