"use client";

import type { ParticipantCandidate } from "@/components/participant-picker";

interface PurchaseChargeSelectProps {
  id?: string;
  participantIds: string[];
  candidates: ParticipantCandidate[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export function PurchaseChargeSelect({
  id,
  participantIds,
  candidates,
  value,
  onChange,
}: PurchaseChargeSelectProps) {
  const selectedParticipants = participantIds
    .map((participantId) => candidates.find((candidate) => candidate.id === participantId))
    .filter((candidate): candidate is ParticipantCandidate => candidate !== undefined);

  const canDirectCharge = selectedParticipants.length === 1;
  const selectedParticipant = canDirectCharge ? selectedParticipants[0] : null;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        Quem paga
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={!canDirectCharge}
        className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
      >
        <option value="">Dividir igualmente</option>
        {selectedParticipant && (
          <option value={selectedParticipant.id}>
            {selectedParticipant.name} paga 100%
          </option>
        )}
      </select>
      {!canDirectCharge ? (
        <p className="text-xs text-muted-foreground">
          Para direcionar 100% da compra, selecione exatamente 1 participante.
        </p>
      ) : value === selectedParticipant?.id ? (
        <p className="text-xs text-muted-foreground">
          Nessa opção, o titular do cartão fica com R$ 0,00 nessa compra e{" "}
          {selectedParticipant.name} assume 100% do valor.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Use essa opção quando só {selectedParticipant?.name} for pagar ou
          reembolsar o valor inteiro da compra.
        </p>
      )}
    </div>
  );
}
