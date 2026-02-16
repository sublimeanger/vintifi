import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CheckResult } from "./types";

const statusIcon = {
  pass: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-destructive shrink-0" />,
};

interface CheckRowProps {
  check: CheckResult;
  editingField: string | null;
  onStartEdit: (field: string) => void;
  editValue: string;
  onEditChange: (value: string) => void;
}

export function CheckRow({ check, editingField, onStartEdit, editValue, onEditChange }: CheckRowProps) {
  const isEditing = editingField === check.field;

  return (
    <div className="py-1.5 px-1">
      <div className="flex items-start gap-2.5 group">
        {statusIcon[check.status]}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{check.label}</p>
          <p className="text-xs text-muted-foreground">{check.detail}</p>
        </div>
        {check.editable && !isEditing && (
          <button
            onClick={() => onStartEdit(check.field)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
          >
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-2 ml-6.5 pl-[26px]">
          {check.inputType === "textarea" ? (
            <Textarea
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="text-sm h-20"
              placeholder={`Enter ${check.label.toLowerCase()}...`}
              autoFocus
            />
          ) : check.inputType === "select" ? (
            <Select value={editValue} onValueChange={onEditChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={`Select ${check.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {check.selectOptions?.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : check.inputType === "number" ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="h-8 text-sm"
              placeholder={`Enter ${check.label.toLowerCase()}...`}
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  );
}
