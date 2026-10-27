import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/auth-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setAuthError(null);
      await signUp(data.email, data.password, data.username);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-editorial-surface border border-editorial-border rounded-md shadow-card p-6 sm:p-8">
        <div className="flex flex-col gap-1 mb-6 text-center">
          <div className="w-9 h-9 rounded bg-editorial-dark text-editorial-ivory mx-auto flex items-center justify-center font-heading font-bold text-sm tracking-tight mb-2">
            HQ
          </div>
          <h1 className="font-heading font-bold text-2xl text-editorial-charcoal tracking-tight">
            Create Player Profile
          </h1>
          <p className="text-xs text-editorial-muted">
            Join the Free Fire Esports HQ circuit to track tournaments and coordinate your squad.
          </p>
        </div>

        {authError && (
          <div className="mb-5 p-3.5 bg-editorial-orange-light border border-[#F6CEB4] rounded text-xs text-editorial-charcoal flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-editorial-orange shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-editorial-orange">Auth Error: </span>
              <span>{authError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="In-Game / Player Tag"
            placeholder="e.g. Total_Ajjubhai"
            error={errors.username?.message}
            helperText="Your public handle across tournament brackets"
            {...register('username')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="player@esportshq.gg"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-editorial-muted mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-editorial-green" />
            <span>Profile stored securely in Supabase PostgreSQL</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-editorial-border text-center">
          <p className="text-xs text-editorial-muted">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-editorial-green hover:underline">
              Sign in to your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
