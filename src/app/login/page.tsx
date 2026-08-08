"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { login } from "@/lib/actions/auth-actions";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginInput>();

  async function onSubmit(values: LoginInput) {
    setServerError(null);

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await login(parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm font-medium">
            Usuário
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("username", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("password", { required: true })}
          />
        </div>

        {serverError && (
          <p className="text-sm text-red-600" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
