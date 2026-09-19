import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, Wrench } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate, formatINR, todayIso } from "@/lib/format";
import { CHORE_AREAS, FREQUENCIES, MEMBERS, WEEKDAYS } from "@/lib/constants";
import { useHouses } from "@/lib/config";
import type { Appliance, Chore } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/** "Weekly · Mon, Thu" / "Monthly · 1st, 15th" is encoded in the title suffix so the
 *  schedule survives without a schema change: "Water plants @Mon,Thu". */
function splitSchedule(title: string): { label: string; days: string } {
  const at = title.lastIndexOf(" @");
  if (at === -1) return { label: title, days: "" };
  return { label: title.slice(0, at), days: title.slice(at + 2) };
}

export default function Chores() {
  const qc = useQueryClient();
  const today = todayIso();

  // chore form
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("Common");
  const [frequency, setFrequency] = useState<string>("Daily");
  const [area, setArea] = useState<string>("household");
  const [dueDate, setDueDate] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [monthDays, setMonthDays] = useState("");

  // appliance form
  const [applianceOpen, setApplianceOpen] = useState(false);
  const [aName, setAName] = useState("");
  const [aLocation, setALocation] = useState("");
  const [aInterval, setAInterval] = useState("6");
  const [aLast, setALast] = useState("");
  const [aNotes, setANotes] = useState("");

  // service record form
  const [serviceFor, setServiceFor] = useState<Appliance | null>(null);
  const [sDate, setSDate] = useState(today);
  const [sVendor, setSVendor] = useState("");
  const [sCost, setSCost] = useState("");
  const [sNotes, setSNotes] = useState("");

  const houses = useHouses();
  const [houseId, setHouseId] = useState<string>("");
  const activeHouse = houseId || houses.data?.find((h) => h.is_default)?.id || houses.data?.[0]?.id || "";
  const [newHouse, setNewHouse] = useState("");

  const chores = useQuery({ queryKey: ["chores"], queryFn: () => apiGet<Chore[]>("/chores") });
  const appliances = useQuery({
    queryKey: ["appliances", activeHouse],
    queryFn: () => apiGet<Appliance[]>(activeHouse ? `/appliances?house_id=${activeHouse}` : "/appliances"),
  });

  const addHouse = useMutation({
    mutationFn: () => apiPost("/houses", { name: newHouse.trim(), address: "", is_default: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["houses"] });
      setNewHouse("");
      toast.success("House added");
    },
    onError: (err) => toast.error(`Could not add: ${err.message}`),
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => apiPost(`/houses/${id}/default`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["houses"] });
      toast.success("Default house set");
    },
  });

  const removeHouse = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/houses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["houses"] });
      qc.invalidateQueries({ queryKey: ["appliances"] });
      toast.success("House removed");
    },
  });

  const invalidateChores = () => qc.invalidateQueries({ queryKey: ["chores"] });
  const invalidateAppliances = () => qc.invalidateQueries({ queryKey: ["appliances"] });

  const createChore = useMutation({
    mutationFn: () => {
      const schedule =
        frequency === "Weekly" && weekdays.length
          ? ` @${weekdays.join(",")}`
          : (frequency === "Monthly" || frequency === "Seasonal") && monthDays.trim()
            ? ` @${monthDays.trim()}`
            : "";
      return apiPost<Chore>("/chores", {
        title: `${title}${schedule}`,
        assignee,
        frequency,
        area,
        due_date: dueDate || null,
      });
    },
    onSuccess: () => {
      invalidateChores();
      setOpen(false);
      setTitle("");
      setDueDate("");
      setWeekdays([]);
      setMonthDays("");
      toast.success("Chore added");
    },
    onError: (err) => toast.error(`Could not add: ${err.message}`),
  });

  const toggleChore = useMutation({
    mutationFn: (c: Chore) => apiPatch<Chore>(`/chores/${c.id}`, { done: !c.done }),
    onSuccess: invalidateChores,
  });

  const removeChore = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/chores/${id}`),
    onSuccess: invalidateChores,
  });

  const createAppliance = useMutation({
    mutationFn: () =>
      apiPost<Appliance>("/appliances", {
        name: aName,
        house_id: activeHouse || null,
        location: aLocation,
        service_interval_months: Number(aInterval) || 6,
        last_serviced_on: aLast || null,
        notes: aNotes,
      }),
    onSuccess: () => {
      invalidateAppliances();
      setApplianceOpen(false);
      setAName("");
      setALocation("");
      setALast("");
      setANotes("");
      toast.success("Appliance tracked");
    },
    onError: (err) => toast.error(`Could not add: ${err.message}`),
  });

  const removeAppliance = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/appliances/${id}`),
    onSuccess: invalidateAppliances,
  });

  const addService = useMutation({
    mutationFn: () =>
      apiPost(`/appliances/${serviceFor!.id}/services`, {
        date: sDate,
        vendor: sVendor,
        cost: Number(sCost) || 0,
        notes: sNotes,
      }),
    onSuccess: () => {
      invalidateAppliances();
      setServiceFor(null);
      setSVendor("");
      setSCost("");
      setSNotes("");
      toast.success("Service logged");
    },
    onError: (err) => toast.error(`Could not log: ${err.message}`),
  });

  const renderChores = (which: string) => {
    const list = [...(chores.data ?? [])]
      .filter((c) => (c.area || "household") === which)
      .sort((a, b) => Number(a.done) - Number(b.done));
    if (list.length === 0) {
      return (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="font-heading text-lg">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the recurring rhythm of the house.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c, idx) => {
          const overdue = !c.done && c.due_date != null && c.due_date < today;
          const { label, days } = splitSchedule(c.title);
          return (
            <Card
              key={c.id}
              data-testid="chore-card"
              className={`card-lift animate-pop-in rounded-2xl p-5 ${c.done ? "opacity-60" : ""} ${overdue ? "border-[#B93826]/50 bg-[#FDF0EB]" : ""}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={c.done} onCheckedChange={() => toggleChore.mutate(c)} data-testid="chore-done-checkbox" />
                <div className="flex-1">
                  <p className={`font-medium ${c.done ? "text-muted-foreground line-through" : ""}`}>{label}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{c.assignee}</Badge>
                    <Badge variant="outline">{c.frequency}</Badge>
                    {days && (
                      <span className="rounded-full bg-[#F1E9DA] px-2 py-0.5 font-medium text-[#6B5426]" data-testid="chore-schedule-chip">
                        {days}
                      </span>
                    )}
                    {c.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? "font-semibold text-[#B93826]" : ""}`}>
                        <CalendarClock className="h-3.5 w-3.5" /> {formatDate(c.due_date)}
                        {overdue ? " · overdue" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon-xs" data-testid="chore-delete-button" onClick={() => removeChore.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Chores & Home Care"
        subtitle="Daily, weekly and monthly duties — plus every appliance's service history."
        actions={
          <>
            <Button variant="outline" data-testid="appliance-add-button" onClick={() => setApplianceOpen(true)}>
              <Wrench className="h-4 w-4" /> Track appliance
            </Button>
            <Button data-testid="chores-add-button" onClick={() => setOpen(true)} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
              <Plus className="h-4 w-4" /> Add chore
            </Button>
          </>
        }
      />

      <Tabs defaultValue="household">
        <TabsList variant="line">
          <TabsTrigger value="household" data-testid="chores-tab-household">
            Household chores
          </TabsTrigger>
          <TabsTrigger value="service" data-testid="chores-tab-service">
            Service history
          </TabsTrigger>
          <TabsTrigger value="houses" data-testid="chores-tab-houses">
            Houses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="household" className="mt-4">
          {renderChores("household")}
        </TabsContent>

        <TabsContent value="service" className="mt-4">
          <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
            <span className="text-sm font-medium">House</span>
            <select
              data-testid="service-house-select"
              value={activeHouse}
              onChange={(e) => setHouseId(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {(houses.data ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(appliances.data ?? []).map((a, idx) => (
              <Card
                key={a.id}
                data-testid="appliance-card"
                className={`card-lift animate-pop-in rounded-2xl p-5 ${a.overdue ? "border-[#B93826]/50" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-semibold" data-testid="appliance-name">
                      {a.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {[a.location, `every ${a.service_interval_months} mo`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="appliance-log-service-button"
                      onClick={() => {
                        setServiceFor(a);
                        setSDate(today);
                      }}
                    >
                      Log service
                    </Button>
                    <Button variant="ghost" size="icon-xs" data-testid="appliance-delete-button" onClick={() => removeAppliance.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Last serviced</p>
                    <p className="font-medium" data-testid="appliance-last-serviced">
                      {a.last_serviced_on ? formatDate(a.last_serviced_on) : "Never"}
                    </p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${a.overdue ? "bg-[#FDF0EB] text-[#B93826]" : "bg-muted/60"}`}>
                    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">Next due</p>
                    <p className="font-medium" data-testid="appliance-next-due">
                      {a.next_due ? formatDate(a.next_due) : "—"}
                      {a.overdue ? " · overdue" : ""}
                    </p>
                  </div>
                </div>

                {a.records.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      History
                    </p>
                    <ul className="grid gap-1.5">
                      {a.records.slice(0, 4).map((r) => (
                        <li key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs" data-testid="service-record-row">
                          <span>
                            {formatDate(r.date)}
                            {r.vendor ? ` · ${r.vendor}` : ""}
                            {r.notes ? ` · ${r.notes}` : ""}
                          </span>
                          {r.cost > 0 && <span className="font-mono font-semibold">{formatINR(r.cost)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
          {appliances.data && appliances.data.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="font-heading text-lg">No appliances tracked</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the geyser, AC, purifier… and never miss a service.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="houses" className="mt-4">
          <div className="glass mb-4 flex flex-wrap items-end gap-2 rounded-2xl p-4">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="house-name">Add a house</Label>
              <Input
                id="house-name"
                data-testid="house-name-input"
                value={newHouse}
                onChange={(e) => setNewHouse(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newHouse.trim() && addHouse.mutate()}
                placeholder="Farm house, Parents' house…"
              />
            </div>
            <Button data-testid="house-add-button" disabled={!newHouse.trim() || addHouse.isPending} onClick={() => addHouse.mutate()} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(houses.data ?? []).map((h) => (
              <Card key={h.id} className={`card-lift rounded-2xl p-5 ${h.is_default ? "gold-edge" : ""}`} data-testid="house-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-lg font-semibold" data-testid="house-card-name">
                      {h.name}
                    </h3>
                    {h.is_default && (
                      <span className="mt-1 inline-block rounded-full bg-[#F1E9DA] px-2 py-0.5 text-[11px] font-semibold text-[#6B5426]" data-testid="house-default-badge">
                        Default
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon-xs" data-testid="house-delete-button" onClick={() => removeHouse.mutate(h.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                  </Button>
                </div>
                {!h.is_default && (
                  <Button variant="outline" size="sm" className="mt-3" data-testid="house-set-default-button" onClick={() => makeDefault.mutate(h.id)}>
                    Make default
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* add chore */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add chore</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="chore-title">What needs doing?</Label>
              <Input id="chore-title" data-testid="chore-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mop the balcony" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Area</Label>
                <Select value={area} onValueChange={(v: string) => setArea(v)}>
                  <SelectTrigger data-testid="chore-area-select">
                    <SelectValue>{CHORE_AREAS.find((a) => a.value === area)?.label ?? area}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CHORE_AREAS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Assignee</Label>
                <Select value={assignee} onValueChange={(v: string) => setAssignee(v)}>
                  <SelectTrigger data-testid="chore-assignee-select">
                    <SelectValue>{assignee}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v: string) => setFrequency(v)}>
                  <SelectTrigger data-testid="chore-frequency-select">
                    <SelectValue>{frequency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {frequency === "Weekly" && (
              <div className="grid gap-1.5">
                <Label>On which days?</Label>
                <div className="flex flex-wrap gap-1.5" data-testid="chore-weekday-picker">
                  {WEEKDAYS.map((d) => {
                    const on = weekdays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        data-testid={`chore-weekday-${d}`}
                        onClick={() => setWeekdays((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]))}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          on ? "bg-[#1E4030] text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(frequency === "Monthly" || frequency === "Seasonal") && (
              <div className="grid gap-1.5">
                <Label htmlFor="chore-monthdays">On which dates? (comma separated)</Label>
                <Input
                  id="chore-monthdays"
                  data-testid="chore-monthdays-input"
                  value={monthDays}
                  onChange={(e) => setMonthDays(e.target.value)}
                  placeholder="1, 15"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="chore-due">Next due date (optional)</Label>
              <Input id="chore-due" data-testid="chore-due-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="chore-save-button" disabled={!title || createChore.isPending} onClick={() => createChore.mutate()} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
              Add chore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* add appliance */}
      <Dialog open={applianceOpen} onOpenChange={setApplianceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Track an appliance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="appliance-name">Appliance</Label>
              <Input id="appliance-name" data-testid="appliance-name-input" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Geyser (Master bath)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="appliance-location">Location</Label>
                <Input id="appliance-location" data-testid="appliance-location-input" value={aLocation} onChange={(e) => setALocation(e.target.value)} placeholder="Bathroom" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="appliance-interval">Service every (months)</Label>
                <Input id="appliance-interval" data-testid="appliance-interval-input" type="number" min="1" value={aInterval} onChange={(e) => setAInterval(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="appliance-last">Last serviced on</Label>
              <Input id="appliance-last" data-testid="appliance-last-input" type="date" value={aLast} onChange={(e) => setALast(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="appliance-notes">Notes</Label>
              <Textarea id="appliance-notes" data-testid="appliance-notes-input" rows={2} value={aNotes} onChange={(e) => setANotes(e.target.value)} placeholder="Brand, model, AMC details" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplianceOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="appliance-save-button" disabled={!aName || createAppliance.isPending} onClick={() => createAppliance.mutate()} className="bg-[#1E4030] text-white hover:bg-[#23492F]">
              Track it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* log service */}
      <Dialog open={!!serviceFor} onOpenChange={(o) => !o && setServiceFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Log service — {serviceFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="service-date">Date</Label>
                <Input id="service-date" data-testid="service-date-input" type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="service-cost">Cost (₹)</Label>
                <Input id="service-cost" data-testid="service-cost-input" type="number" min="0" value={sCost} onChange={(e) => setSCost(e.target.value)} placeholder="800" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-vendor">Vendor / technician</Label>
              <Input id="service-vendor" data-testid="service-vendor-input" value={sVendor} onChange={(e) => setSVendor(e.target.value)} placeholder="Racold service" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="service-notes">Notes</Label>
              <Textarea id="service-notes" data-testid="service-notes-input" rows={2} value={sNotes} onChange={(e) => setSNotes(e.target.value)} placeholder="Replaced heating element" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceFor(null)}>
              Cancel
            </Button>
            <Button data-testid="service-save-button" disabled={addService.isPending} onClick={() => addService.mutate()} className="bg-[#1E4030] text-white hover:bg-[#23492F]">
              Save record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
