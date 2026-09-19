import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

// Hand-written mirror of the StatusCheck Pydantic model in backend/server.py
interface StatusCheck {
  id: string;
  client_name: string;
  timestamp: string;
}

// queryFn calls the typed fetch layer directly
const fetchStatusChecks = () => apiGet<StatusCheck[]>("/status");

export default function Home() {
  // Result discarded on purpose: this splash must render identically with no backend.
  useQuery({ queryKey: ["status"], queryFn: fetchStatusChecks, retry: false });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0f0f10] text-[calc(10px+2vmin)] text-white">
      <div className="text-6xl mb-6">??</div>
      <h1 className="text-4xl font-bold mb-4">HomeBoard</h1>
      <p className="mt-5">Your household management companion</p>
    </div>
  );
}
