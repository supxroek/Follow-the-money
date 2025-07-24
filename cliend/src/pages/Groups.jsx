import { useEffect } from "react";
import { Link } from "react-router-dom";
import useGroupStore from "../stores/groupStore";
import Loading from "../components/Loading";

const Groups = () => {
  const { groups, isLoading, error, fetchGroups } = useGroupStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">กลุ่มของฉัน</h1>
        <Link
          to="/groups/create"
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          + สร้างกลุ่มใหม่
        </Link>
      </div>
      {isLoading && <Loading text="กำลังโหลดกลุ่ม..." />}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}
      {!isLoading && !error && groups.length === 0 && (
        <div className="text-gray-500 text-center">ยังไม่มีกลุ่ม</div>
      )}
      <ul className="space-y-4">
        {groups.map((group) => (
          <li
            key={group._id}
            className="bg-white rounded shadow p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div>
              <div className="font-semibold text-lg">{group.name}</div>
              <div className="text-gray-500 text-sm">
                {group.description || "-"}
              </div>
            </div>
            <Link
              to={`/groups/${group._id}`}
              className="text-blue-500 hover:underline"
            >
              ดูรายละเอียด
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Groups;
