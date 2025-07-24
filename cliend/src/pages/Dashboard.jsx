import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useGroupStore from "../stores/groupStore";
import useExpenseStore from "../stores/expenseStore";
import useDebtStore from "../stores/debtStore";
import Loading from "../components/Loading";
import Button from "../components/Button";
import useToast from "../hooks/useToast";

import avatarPlaceholder from "../assets/man.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { groups, fetchGroups, isLoading: groupsLoading } = useGroupStore();
  const {
    expenses,
    fetchExpenses,
    isLoading: expensesLoading,
  } = useExpenseStore();
  const { summary, fetchDebtSummary, isLoading: debtsLoading } = useDebtStore();
  const toast = useToast();
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalExpenses: 0,
    totalAmount: 0,
    pendingDebts: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchGroups(), fetchExpenses()]);
      } catch {
        toast.error("Failed to load dashboard data");
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Calculate stats when data changes
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const pendingExpenses = expenses.filter((e) => !e.isSettled).length;

    setStats({
      totalGroups: groups.length,
      totalExpenses: expenses.length,
      totalAmount,
      pendingDebts: pendingExpenses,
    });
  }, [groups, expenses]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const recentExpenses = expenses.slice(0, 5);
  const recentGroups = groups.slice(0, 3);

  if (groupsLoading || expensesLoading) {
    return <Loading text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <img
              className="h-12 w-12 rounded-full"
              src={user?.pictureUrl || avatarPlaceholder}
              alt="Profile"
            />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.displayName || "Admin Suparoek"}!
              </h1>
              <p className="text-gray-600">Here's your expense overview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Groups
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalGroups}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/groups")}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
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
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Expenses
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalExpenses}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/expenses")}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Debts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingDebts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/debts")}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              onClick={() => navigate("/groups/new")}
              className="justify-center"
            >
              Create New Group
            </Button>
            <Button
              onClick={() => navigate("/expenses/new")}
              variant="secondary"
              className="justify-center"
            >
              Add Expense
            </Button>
            <Button
              onClick={() => navigate("/debts")}
              variant="outline"
              className="justify-center"
            >
              Settle Debts
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Expenses
            </h3>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {expense.category} •{" "}
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No recent expenses
              </p>
            )}
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/expenses")}
                className="w-full justify-center"
              >
                View All Expenses
              </Button>
            </div>
          </div>
        </div>

        {/* Active Groups */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Your Groups
            </h3>
            {recentGroups.length > 0 ? (
              <div className="space-y-3">
                {recentGroups.map((group) => (
                  <div
                    key={group._id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {group.members?.length || 0} members
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/groups/${group._id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No groups yet</p>
            )}
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/groups")}
                className="w-full justify-center"
              >
                View All Groups
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
