import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/auth-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { signIn, isDemoMode, setDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setAuthError(null);
      await signIn(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Authentication failed. Please check credentials.');
      }
    }
  };

  const handleDemoSignIn = () => {
    setDemoMode(true);
    navigate('/dashboard');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-editorial-surface border border-editorial-border rounded-md shadow-card p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-6 text-center">
          <div className="w-9 h-9 rounded bg-editorial-dark text-editorial-ivory mx-auto flex items-center justify-center font-heading font-bold text-sm tracking-tight mb-2">
            HQ
          </div>
          <h1 className="font-heading font-bold text-2xl text-editorial-charcoal tracking-tight">
            Sign In to Esports HQ
          </h1>
          <p className="text-xs text-editorial-muted">
            Connect your player profile to access your tournament radar and team roster.
          </p>
        </div>

        {/* Backend Auth Alert */}
        {authError && (
          <div className="mb-5 p-3.5 bg-editorial-orange-light border border-[#F6CEB4] rounded text-xs text-editorial-charcoal flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-editorial-orange shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-editorial-orange">Auth Error: </span>
              <span>{authError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

          <div className="flex items-center justify-between text-xs text-editorial-muted mt-1">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-editorial-green" />
              Supabase Auth
            </span>
            <a href="#forgot" className="hover:text-editorial-charcoal underline">
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Authenticate
          </Button>
        </form>

        {/* Or Demo Preview */}
        <div className="mt-6 pt-6 border-t border-editorial-border flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDemoSignIn}
            className="w-full text-xs font-mono"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-editorial-orange" />}
          >
            Explore with Demo Preview Account
          </Button>

          <p className="text-center text-xs text-editorial-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-editorial-green hover:underline">
              Create squad profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
