import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiDelete, apiPost, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface ListRow {
  id: string;
  name: string;
  order?: number;
}

/**
 * Reusable CRUD list editor for the configurable lists (categories, aisles, timings).
 * `endpoint` is the collection path, e.g. "/categories".
 */
export default function ListEditor({
  title,
  description,
  endpoint,
  queryKey,
  rows,
  placeholder,
  ordered = false,
  testid,
}: {
  title: string;
  description: string;
  endpoint: string;
  queryKey: string;
  rows: ListRow[];
  placeholder: string;
  ordered?: boolean;
  testid: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: [queryKey] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: () =>
      apiPost(endpoint, ordered ? { name: draft.trim(), order: (rows.length + 1) * 10 } : { name: draft.trim() }),
    onSuccess: () => {
      refresh();
      setDraft("");
      toast.success("Added");
    },
    onError: (err) => toast.error(err.message.includes("409") ? "That already exists" : `Could not add: ${err.message}`),
  });

  const rename = useMutation({
    mutationFn: (row: ListRow) =>
      apiPut(`${endpoint}/${row.id}`, ordered ? { name: editValue.trim(), order: row.order ?? 0 } : { name: editValue.trim() }),
    onSuccess: () => {
      refresh();
      setEditingId(null);
      toast.success("Renamed");
    },
    onError: (err) => toast.error(`Could not rename: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`${endpoint}/${id}`),
    onSuccess: () => {
      refresh();
      toast.success("Removed");
    },
    onError: (err) => toast.error(`Could not remove: ${err.message}`),
  });

  return (
    <Card className="rounded-2xl" data-testid={`${testid}-panel`}>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center gap-2">
          <Input
            data-testid={`${testid}-new-input`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && create.mutate()}
            placeholder={placeholder}
          />
          <Button
            data-testid={`${testid}-add-button`}
            disabled={!draft.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="bg-[#D0663C] text-white hover:bg-[#B8552F]"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2" data-testid={`${testid}-row`}>
            {editingId === row.id ? (
              <>
                <Input
                  data-testid={`${testid}-edit-input`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && editValue.trim() && rename.mutate(row)}
                  className="h-8"
                />
                <Button variant="ghost" size="icon-xs" data-testid={`${testid}-edit-save`} onClick={() => rename.mutate(row)}>
                  <Check className="h-4 w-4 text-[#1E4030]" />
                </Button>
                <Button variant="ghost" size="icon-xs" data-testid={`${testid}-edit-cancel`} onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium" data-testid={`${testid}-row-name`}>
                  {row.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-testid={`${testid}-edit-button`}
                  onClick={() => {
                    setEditingId(row.id);
                    setEditValue(row.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" data-testid={`${testid}-delete-button`} onClick={() => remove.mutate(row.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                </Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing configured yet.</p>}
      </CardContent>
    </Card>
  );
}
