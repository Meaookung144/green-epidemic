'use client';

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [currentMotivation, setCurrentMotivation] = useState(0);
  const router = useRouter();
  const { data: session, status } = useSession();

  const motivationalMessages = [
    {
      title: "Your Health, Your Power",
      subtitle: "Take control of your wellness journey with real-time health insights",
      icon: "💪"
    },
    {
      title: "Breathe Better, Live Better",
      subtitle: "Monitor air quality and make informed decisions for cleaner air",
      icon: "🌬️"
    },
    {
      title: "Community Health Heroes",
      subtitle: "Join thousands protecting their families through smart health monitoring",
      icon: "🌟"
    },
    {
      title: "Prevention is the Best Medicine",
      subtitle: "Stay ahead of health risks with AI-powered environmental analysis",
      icon: "🛡️"
    },
    {
      title: "Together We Thrive",
      subtitle: "Connect with healthcare professionals when you need them most",
      icon: "🤝"
    }
  ];

  useEffect(() => {
    // Check if already signed in
    if (status === "authenticated" && session) {
      router.push('/');
    }
  }, [router, session, status]);

  useEffect(() => {
    // Rotate motivational messages every 4 seconds
    const interval = setInterval(() => {
      setCurrentMotivation((prev) => (prev + 1) % motivationalMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [motivationalMessages.length]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { 
        redirectTo: '/'
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  const handleLineSignIn = async () => {
    setLoading(true);
    try {
      await signIn('line', { 
        redirectTo: '/'
      });
    } catch (error) {
      console.error('LINE sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Motivational Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-white rounded-full animate-ping animation-delay-200"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white rounded-full animate-bounce animation-delay-300"></div>
          <div className="absolute bottom-40 right-10 w-12 h-12 bg-white rounded-full animate-pulse animation-delay-500"></div>
          <div className="absolute top-1/2 left-1/3 w-8 h-8 bg-white rounded-full animate-ping animation-delay-700"></div>
          <div className="absolute top-1/4 right-1/3 w-6 h-6 bg-white rounded-full animate-bounce animation-delay-1000"></div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-32 text-4xl animate-float">🌿</div>
          <div className="absolute bottom-32 left-32 text-3xl animate-float animation-delay-300">💚</div>
          <div className="absolute top-1/3 left-1/4 text-2xl animate-float animation-delay-600">🏥</div>
          <div className="absolute bottom-1/3 right-1/4 text-3xl animate-float animation-delay-900">🌟</div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 text-white">
          <div className="mb-8">
            <div className="text-6xl mb-4 animate-bounce">
              {motivationalMessages[currentMotivation].icon}
            </div>
            <h1 className="text-4xl font-bold mb-4 transition-all duration-1000 ease-in-out">
              {motivationalMessages[currentMotivation].title}
            </h1>
            <p className="text-xl opacity-90 transition-all duration-1000 ease-in-out">
              {motivationalMessages[currentMotivation].subtitle}
            </p>
          </div>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-4 mt-8 max-w-md">
            <div className="flex items-center space-x-3 bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl">🏥</span>
              <span className="text-sm">Telemedicine consultations</span>
            </div>
            <div className="flex items-center space-x-3 bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl">🌡️</span>
              <span className="text-sm">Real-time health monitoring</span>
            </div>
            <div className="flex items-center space-x-3 bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl">🤖</span>
              <span className="text-sm">AI-powered health insights</span>
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex space-x-2 mt-8">
            {motivationalMessages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentMotivation ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-md w-full space-y-8">
          {/* Mobile motivational header */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl mb-2">🌿</div>
            <h2 className="text-2xl font-bold text-gray-800">Green Epidemic</h2>
            <p className="text-sm text-gray-600 mt-1">Your health companion</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative z-10">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 animate-gradient rounded-full flex items-center justify-center mb-4 shadow-lg relative">
                <span className="text-2xl animate-bounce">🌿</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600">
                Sign in to continue your health journey
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-emerald-300"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">or</span>
                </div>
              </div>

              {/* LINE Sign In */}
              <button
                onClick={handleLineSignIn}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 bg-size-200 animate-gradient"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12.001.572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    Continue with LINE
                  </>
                )}
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 text-center">
              <div className="flex justify-center items-center space-x-4 mb-3">
                <div className="flex items-center text-xs text-gray-500">
                  <span className="text-green-500 mr-1">🔒</span>
                  Secure Login
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span className="text-blue-500 mr-1">🏥</span>
                  HIPAA Compliant
                </div>
              </div>
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <a href="#" className="text-emerald-600 hover:text-emerald-700 underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-emerald-600 hover:text-emerald-700 underline">Privacy Policy</a>
              </p>
            </div>
          </div>

          {/* Bottom inspiration */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 italic">
              &ldquo;Every small step towards better health creates a healthier tomorrow&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}