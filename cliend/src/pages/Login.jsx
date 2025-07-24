import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import Loading from "../components/Loading";
import Button from "../components/Button";
import useToast from "../hooks/useToast";

const Login = () => {
  const navigate = useNavigate();
  const { initialize, login, isAuthenticated, isLoading } = useAuthStore();
  const toast = useToast();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initialize();
        if (isAuthenticated) {
          navigate("/");
        }
      } catch {
        toast.error("Failed to initialize authentication");
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await login();
      toast.success("Login successful");
      navigate("/");
    } catch {
      toast.error("Login failed. Please try again.");
    }
  };

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading text="Initializing..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-10 w-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            LINE Shared Expense Tracker
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Track and split expenses with your friends using LINE
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Welcome!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Sign in with your LINE account to get started with expense
                tracking and splitting bills with friends.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white"
                size="lg"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                Login with LINE
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our terms of service and privacy
                policy
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Features:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Create expense groups with friends</li>
              <li>• Split bills automatically</li>
              <li>• Track who owes what</li>
              <li>• Send payment reminders via LINE</li>
              <li>• View detailed expense reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
