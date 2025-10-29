import React from "react";
import { useAuth } from "../contexts/AuthContext";

const UserList: React.FC<{ onUserSelect: (userId: string) => void }> = ({ onUserSelect }) => {
  const { users, user } = useAuth();  // Now `users` is properly fetched

  return (
    <div>
      <h2>Available Users</h2>
      <ul>
        {users
          .filter((u) => u.uid !== user?.uid) // Exclude current user
          .map((u) => (
            <li key={u.uid} onClick={() => onUserSelect(u.uid)} style={{ cursor: "pointer" }}>
              <img src={u.photoURL || "default-avatar.png"} alt={u.displayName} width={40} height={40} />
              <span>{u.displayName}</span>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default UserList;
