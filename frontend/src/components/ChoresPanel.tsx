import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, Wrench } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import type { Appliance, Chore } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

/** Chores tab of the dashboard: household duties + anything overdue for service. */
export default function ChoresPanel() {
  const qc = useQueryClient();
  const today = todayIso();

  const chores = useQuery({ queryKey: ["chores", "household"], queryFn: () => apiGet<Chore[]>("/chores?area=household") });
  const appliances = useQuery({ queryKey: ["appliances"], queryFn: () => apiGet<Appliance[]>("/appliances") });

  const toggle = useMutation({
    mutationFn: (c: Chore) => apiPatch<Chore>(`/chores/${c.id}`, { done: !c.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  const list = [...(chores.data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));
  const dueSoon = (appliances.data ?? []).filter((a) => a.overdue);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl">Household chores</CardTitle>
          <Link to="/chores">
            <Button variant="ghost" size="sm" data-testid="chores-panel-manage-link">
              Manage
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-2">
          {list.map((c) => {
            const overdue = !c.done && c.due_date != null && c.due_date < today;
            return (
              <div
                key={c.id}
                data-testid="chores-panel-row"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${overdue ? "bg-[#FDF0EB]" : "bg-muted/60"}`}
              >
                <Checkbox checked={c.done} onCheckedChange={() => toggle.mutate(c)} data-testid="chores-panel-checkbox" />
                <span className={`flex-1 text-sm ${c.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {c.title.split(" @")[0]}
                </span>
                {c.title.includes(" @") && (
                  <span className="rounded-full bg-[#F1E9DA] px-2 py-0.5 text-[11px] font-medium text-[#6B5426]">
                    {c.title.split(" @")[1]}
                  </span>
                )}
                <Badge variant="outline">{c.frequency}</Badge>
                <Badge variant="secondary">{c.assignee}</Badge>
              </div>
            );
          })}
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No household chores yet.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Wrench className="h-5 w-5 text-[#D0663C]" /> Service due
          </CardTitle>
          <Link to="/chores">
            <Button variant="ghost" size="sm" data-testid="chores-panel-service-link">
              All appliances
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-2">
          {dueSoon.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl bg-[#FDF0EB] px-3 py-2.5" data-testid="chores-panel-service-row">
              <div>
                <p className="text-sm font-medium text-[#5C200C]">{a.name}</p>
                <p className="text-xs text-[#8C4328]">{a.location || "—"}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#B93826]">
                <CalendarClock className="h-3.5 w-3.5" /> {a.next_due ? formatDate(a.next_due) : "—"}
              </span>
            </div>
          ))}
          {dueSoon.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Everything is within its service window.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
