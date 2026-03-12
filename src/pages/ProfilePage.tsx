import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { User, Mail, Briefcase, GraduationCap, Clock, Building2, Award, BookOpen, LogOut, Pencil } from "lucide-react";

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
  detailsCompleted?: boolean;
  details?: {
    fullName?: string;
    domain?: string;
    experience?: string;
    education?: string;
    year?: string;
    organization?: string;
    expertise?: string;
  };
  availableTimeSlots?: string[];
  createdAt?: any;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editingSlots, setEditingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [savingSlots, setSavingSlots] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const details = profile?.details || {};
  const isMentor = profile?.role === "mentor";

  const startEditing = () => {
    if (isMentor) {
      setEditData({
        domain: details.domain || "",
        experience: details.experience || "",
        organization: details.organization || "",
        expertise: details.expertise || "",
      });
    } else {
      setEditData({
        education: details.education || "",
        year: details.year || "",
      });
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  const saveDetails = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const updatedDetails = { ...details, ...editData };
      await setDoc(userRef, { details: updatedDetails, updatedAt: new Date() }, { merge: true });
      setProfile((prev) => prev ? { ...prev, details: updatedDetails } : prev);
      setEditing(false);
    } catch (error) {
      console.error("Error saving details:", error);
    } finally {
      setSaving(false);
    }
  };

  const ALL_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

  const startEditingSlots = () => {
    setSelectedSlots(profile?.availableTimeSlots || []);
    setEditingSlots(true);
  };

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const saveSlots = async () => {
    if (!user) return;
    setSavingSlots(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { availableTimeSlots: selectedSlots, updatedAt: new Date() }, { merge: true });
      setProfile((prev) => prev ? { ...prev, availableTimeSlots: selectedSlots } : prev);
      setEditingSlots(false);
    } catch (error) {
      console.error("Error saving time slots:", error);
    } finally {
      setSavingSlots(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const displayName = profile?.name || user?.displayName || "User";
  const hasPhoto = !!user?.photoURL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header - Blue card with avatar, name, email, role */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-5">
              {hasPhoto ? (
                <img
                  src={user.photoURL!}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-2 border-white/30 shadow-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-white/30 shadow-lg bg-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{getInitials(displayName)}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {profile?.name || user?.displayName || "User"}
                </h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  {profile?.email || user?.email}
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold ${
                    isMentor
                      ? "bg-white/20 text-white"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {isMentor ? "Mentor" : "Mentee"}
                </span>
              </div>
            </div>
          </div>

          {/* Details Cards - Stacked vertically */}
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Basic Information
              </h2>
              <div className="space-y-4">
                <InfoRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Full Name"
                  value={details.fullName || profile?.name || user?.displayName || "—"}
                />
                <InfoRow
                  icon={<Mail className="w-4 h-4 text-gray-400" />}
                  label="Email"
                  value={profile?.email || user?.email || "—"}
                />
                <InfoRow
                  icon={<Award className="w-4 h-4 text-gray-400" />}
                  label="Role"
                  value={isMentor ? "Mentor" : "Mentee"}
                />
              </div>
            </div>

            {/* Professional / Academic Details */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  {isMentor ? (
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  )}
                  {isMentor ? "Professional Details" : "Academic Details"}
                </h2>
                {!editing ? (
                  <button
                    onClick={startEditing}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              <div className="space-y-4">
                {isMentor ? (
                  <>
                    {editing ? (
                      <>
                        <EditField label="Domain" value={editData.domain || ""} onChange={(v) => setEditData({ ...editData, domain: v })} />
                        <EditField label="Experience" value={editData.experience || ""} onChange={(v) => setEditData({ ...editData, experience: v })} />
                        <EditField label="Organization" value={editData.organization || ""} onChange={(v) => setEditData({ ...editData, organization: v })} />
                        <EditField label="Expertise" value={editData.expertise || ""} onChange={(v) => setEditData({ ...editData, expertise: v })} />
                      </>
                    ) : (
                      <>
                        <InfoRow icon={<BookOpen className="w-4 h-4 text-gray-400" />} label="Domain" value={details.domain || "—"} />
                        <InfoRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="Experience" value={details.experience ? `${details.experience} years` : "—"} />
                        <InfoRow icon={<Building2 className="w-4 h-4 text-gray-400" />} label="Organization" value={details.organization || "—"} />
                        <InfoRow icon={<Award className="w-4 h-4 text-gray-400" />} label="Expertise" value={details.expertise || "—"} />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {editing ? (
                      <>
                        <EditField label="Education" value={editData.education || ""} onChange={(v) => setEditData({ ...editData, education: v })} />
                        <EditField label="Year" value={editData.year || ""} onChange={(v) => setEditData({ ...editData, year: v })} />
                      </>
                    ) : (
                      <>
                        <InfoRow icon={<GraduationCap className="w-4 h-4 text-gray-400" />} label="Education" value={details.education || "—"} />
                        <InfoRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="Year" value={details.year || "—"} />
                      </>
                    )}
                  </>
                )}
              </div>
              {editing && (
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDetails}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Update"}
                  </button>
                </div>
              )}
            </div>

            {/* Available Time Slots (Mentors only) */}
            {isMentor && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Available Time Slots
                  </h2>
                  {!editingSlots ? (
                    <button
                      onClick={startEditingSlots}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
                {editingSlots ? (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {ALL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedSlots.includes(slot)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setEditingSlots(false)}
                        className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveSlots}
                        disabled={savingSlots}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {savingSlots ? "Saving..." : "Update"}
                      </button>
                    </div>
                  </>
                ) : profile?.availableTimeSlots && profile.availableTimeSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.availableTimeSlots.map((slot) => (
                      <span
                        key={slot}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No time slots selected</p>
                )}
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
