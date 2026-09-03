import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../providers/trpc";
import { useFarm } from "../hooks/useFarm";
import { Modal } from "../components/Modal";
import { ROLES } from "../../contracts/constants";

const memberRoles = ["worker", "agronomist", "farm_manager"] as const;

const addMemberSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(8, "8 أحرف على الأقل"),
  role: z.enum(memberRoles),
  phone: z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(memberRoles),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;
type InviteForm = z.infer<typeof inviteSchema>;

export default function Team() {
  const { currentFarmId, currentFarm } = useFarm();
  const utils = trpc.useUtils();

  const membersQuery = trpc.farms.listMembers.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
    const invitesQuery = trpc.farms.listInvitations.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const fieldsQuery = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const workersQuery = trpc.workers.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );

  const assignMutation = trpc.workers.assignToField.useMutation({
    onSuccess: () => {
      utils.workers.list.invalidate();
      utils.fields.list.invalidate();
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  const addForm = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: "worker" },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "worker" },
  });

  const addMutation = trpc.farms.addMemberDirect.useMutation({
    onSuccess: (_data, variables) => {
      utils.farms.listMembers.invalidate();
      setCreatedCreds({
        email: variables.email,
        password: variables.password,
        name: variables.name,
      });
      addForm.reset({ name: "", email: "", password: "", role: "worker", phone: "" });
    },
  });

  const inviteMutation = trpc.farms.invite.useMutation({
    onSuccess: (data) => {
      setLastCode(data.code);
      utils.farms.listInvitations.invalidate();
      inviteForm.reset({ email: "", role: "worker" });
    },
  });

  const toggleMutation = trpc.farms.toggleMemberActive.useMutation({
    onSuccess: () => utils.farms.listMembers.invalidate(),
  });

  const roleMutation = trpc.farms.updateMemberRole.useMutation({
    onSuccess: () => utils.farms.listMembers.invalidate(),
  });

  const removeMutation = trpc.farms.removeMember.useMutation({
    onSuccess: () => utils.farms.listMembers.invalidate(),
  });

  if (!currentFarmId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        جاري تهيئة المزرعة...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 فريق المزرعة</h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentFarm?.name} — إدارة الأعضاء
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCreatedCreds(null);
              setAddOpen(true);
            }}
            className="bg-[#1c3d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15301f]"
          >
            + إضافة عضو
          </button>
          <button
            onClick={() => {
              setLastCode(null);
              setInviteOpen(true);
            }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            دعوة بكود
          </button>
        </div>
      </div>

      {createdCreds && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          تم إنشاء الحساب لـ <b>{createdCreds.name}</b>
          <br />
          البريد: <b>{createdCreds.email}</b> — كلمة المرور:{" "}
          <b className="font-mono">{createdCreds.password}</b>
          <br />
          <span className="text-green-700">سلّم هذه البيانات للعضو ليسجّل الدخول.</span>
          <button
            className="ms-3 text-xs underline"
            onClick={() => setCreatedCreds(null)}
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-gray-100 font-medium text-gray-800">
          الأعضاء ({membersQuery.data?.length ?? 0})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-start px-5 py-3 font-medium">الاسم</th>
                <th className="text-start px-5 py-3 font-medium">البريد</th>
                <th className="text-start px-5 py-3 font-medium">الدور</th>
                <th className="text-start px-5 py-3 font-medium">الحقل المعيّن</th>
                <th className="text-start px-5 py-3 font-medium">الحالة</th>
                <th className="text-start px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    جاري التحميل...
                  </td>
                </tr>
              )}
              {membersQuery.data?.map((m) => (
                <tr key={m.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-5 py-3 text-gray-600">{m.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        roleMutation.mutate({
                          farmId: currentFarmId,
                          memberId: m.id,
                          role: e.target.value as (typeof ROLES)[number],
                        })
                      }
                      className="rounded border border-gray-200 px-2 py-1 text-xs"
                    >
                      {memberRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                                    <td className="px-5 py-3">
                    {m.role === "worker" ? (
                      <select
                        className="rounded border border-gray-200 px-2 py-1 text-xs max-w-[140px]"
                        value={
                          workersQuery.data?.find((w) => w.userId === m.userId)
                            ?.fieldId ?? ""
                        }
                        onChange={(e) =>
                          assignMutation.mutate({
                            farmId: currentFarmId,
                            userId: m.userId,
                            name: m.name,
                            phone: m.phone ?? undefined,
                            fieldId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">— بدون حقل —</option>
                        {fieldsQuery.data?.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td className="px-5 py-3 space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          farmId: currentFarmId,
                          memberId: m.id,
                          isActive: !m.isActive,
                        })
                      }
                      className="text-xs text-amber-700 hover:underline"
                    >
                      {m.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("إزالة هذا العضو من المزرعة؟")) {
                          removeMutation.mutate({
                            farmId: currentFarmId,
                            memberId: m.id,
                          });
                        }
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      إزالة
                    </button>
                  </td>
                </tr>
              ))}
              {!membersQuery.isLoading && (membersQuery.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    لا يوجد أعضاء بعد — اضغط «إضافة عضو»
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invites (secondary) */}
      {(invitesQuery.data?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-medium text-gray-800">
            دعوات بالكود معلّقة ({invitesQuery.data?.length})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-start px-5 py-3 font-medium">البريد</th>
                <th className="text-start px-5 py-3 font-medium">الدور</th>
                <th className="text-start px-5 py-3 font-medium">الكود</th>
              </tr>
            </thead>
            <tbody>
              {invitesQuery.data?.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-50">
                  <td className="px-5 py-3">{inv.email}</td>
                  <td className="px-5 py-3">{inv.role}</td>
                  <td className="px-5 py-3 font-mono font-semibold tracking-wider">
                    {inv.code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: إضافة عضو مباشرة */}
      {addOpen && (
        <Modal
          title="إضافة عضو جديد"
          onClose={() => {
            setAddOpen(false);
            setCreatedCreds(null);
          }}
        >
          {createdCreds ? (
            <div className="text-center space-y-4 py-2">
              <p className="text-green-800 font-medium">تم بنجاح ✓</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-start">
                <p>
                  الاسم: <b>{createdCreds.name}</b>
                </p>
                <p>
                  البريد: <b>{createdCreds.email}</b>
                </p>
                <p>
                  كلمة المرور:{" "}
                  <b className="font-mono">{createdCreds.password}</b>
                </p>
              </div>
              <p className="text-xs text-gray-500">
                أرسل هذه البيانات للعضو. يمكنه تسجيل الدخول مباشرة ورؤية المزرعة.
              </p>
              <button
                onClick={() => setAddOpen(false)}
                className="w-full bg-[#1c3d2e] text-white rounded-lg py-2 text-sm font-medium"
              >
                إغلاق
              </button>
            </div>
          ) : (
            <form
              onSubmit={addForm.handleSubmit((v) =>
                addMutation.mutate({ farmId: currentFarmId, ...v })
              )}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  {...addForm.register("name")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {addForm.formState.errors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {addForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد</label>
                <input
                  {...addForm.register("email")}
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {addForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-1">
                    {addForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور
                </label>
                <input
                  {...addForm.register("password")}
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  placeholder="8 أحرف على الأقل"
                />
                {addForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-1">
                    {addForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select
                  {...addForm.register("role")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {memberRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الهاتف (اختياري)
                </label>
                <input
                  {...addForm.register("phone")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {addMutation.error && (
                <p className="text-sm text-red-600">{addMutation.error.message}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 bg-[#1c3d2e] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                >
                  إنشاء وإضافة
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Modal: دعوة بكود (ثانوي) */}
      {inviteOpen && (
        <Modal title="دعوة بكود (اختياري)" onClose={() => setInviteOpen(false)}>
          {lastCode ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-gray-600">تم إنشاء الكود</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <p className="text-3xl font-bold tracking-widest text-green-900 font-mono">
                  {lastCode}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                يجب أن يكون لدى المدعو حساب بنفس البريد ثم يدخل الكود من الإعدادات.
              </p>
              <button
                onClick={() => setInviteOpen(false)}
                className="w-full bg-[#1c3d2e] text-white rounded-lg py-2 text-sm font-medium"
              >
                إغلاق
              </button>
            </div>
          ) : (
            <form
              onSubmit={inviteForm.handleSubmit((v) =>
                inviteMutation.mutate({ farmId: currentFarmId, ...v })
              )}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد</label>
                <input
                  {...inviteForm.register("email")}
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select
                  {...inviteForm.register("role")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {memberRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {inviteMutation.error && (
                <p className="text-sm text-red-600">{inviteMutation.error.message}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="flex-1 border rounded-lg py-2 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="flex-1 bg-[#1c3d2e] text-white rounded-lg py-2 text-sm disabled:opacity-60"
                >
                  إنشاء كود
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
