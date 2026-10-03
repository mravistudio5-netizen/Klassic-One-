import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Camera, MapPin, User as UserIcon, MessageSquare, BellRing, Bell, ListChecks, Shield, Trash2, AlertTriangle, Video } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  Pending: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Done: "bg-purple-100 text-purple-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Overdue: "bg-red-100 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [task, setTask] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [geoUrl, setGeoUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [taskData, user] = await Promise.all([
          base44.entities.Task.get(id),
          base44.auth.me(),
        ]);
        setTask(taskData);
        setMe(user);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const updateTask = async (data) => {
    if (["Approved", "Cancelled"].includes(task?.status)) {
      toast.error("This task is closed and cannot be edited");
      return task;
    }
    const updated = await base44.entities.Task.update(id, data);
    setTask(updated);
    return updated;
  };

  const logAudit = async (action, entity) => {
    try {
      await base44.entities.AuditLog.create({
        module: "Tasks",
        action,
        entity_id: entity.id,
        entity_name: entity.title,
        actor_id: me.id,
        actor_name: me.full_name,
        store_id: entity.store_id,
      });
    } catch (e) { console.error(e); }
  };

  const loadPhotoUrls = async (uris) => {
    const urls = await Promise.all((uris || []).map(async (uri) => {
      try { const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri }); return signed_url; }
      catch { return uri; }
    }));
    setPhotoUrls(urls);
  };

  useEffect(() => {
    if (task?.proof_photos?.length) loadPhotoUrls(task.proof_photos);
    else setPhotoUrls([]);
  }, [task?.proof_photos]);

  useEffect(() => {
    if (task?.video_proof_uri) {
      base44.integrations.Core.CreateFileSignedUrl({ file_uri: task.video_proof_uri })
        .then(({ signed_url }) => setVideoUrl(signed_url)).catch(() => setVideoUrl(""));
    } else setVideoUrl("");
    if (task?.geo_tag_photo_uri) {
      base44.integrations.Core.CreateFileSignedUrl({ file_uri: task.geo_tag_photo_uri })
        .then(({ signed_url }) => setGeoUrl(signed_url)).catch(() => setGeoUrl(""));
    } else setGeoUrl("");
  }, [task?.video_proof_uri, task?.geo_tag_photo_uri]);

  const addPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file, not a video"); e.target.value = ""; return; }
    const photos = [...(task.proof_photos || [])];
    if (photos.length >= 5) { toast.error("Max 5 photos"); return; }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await updateTask({ proof_photos: [...photos, file_uri] });
    } catch (e) { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const removePhoto = async (idx) => {
    const next = (task.proof_photos || []).filter((_, i) => i !== idx);
    await updateTask({ proof_photos: next });
  };

  const addVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please select a video file, not a photo"); e.target.value = ""; return; }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await updateTask({ video_proof_uri: file_uri });
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const addGeoPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file, not a video"); e.target.value = ""; return; }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await updateTask({ geo_tag_photo_uri: file_uri });
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const toggleChecklist = async (idx) => {
    const checklist = [...(task.checklist || [])];
    checklist[idx] = { ...checklist[idx], done: !checklist[idx].done };
    await updateTask({ checklist });
  };

  const handleApprove = async () => {
    try {
      await updateTask({ status: "Approved", approved_at: new Date().toISOString(), approved_by_id: me.id });
      await logAudit("Task Approved", task);
      toast.success(t("approved"));
    } catch (e) { toast.error("Failed"); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Reason required"); return; }
    try {
      await updateTask({ status: "Rejected", reject_reason: rejectReason });
      await logAudit("Task Rejected", task);
      toast.success(t("rejected"));
      setShowReject(false);
      setRejectReason("");
    } catch (e) { toast.error("Failed"); }
  };

  if (loading) return <div className="p-4 text-center text-slate-400">Loading...</div>;
  if (!task) return <div className="p-4 text-center text-slate-400">Not found</div>;

  const isAssignee = me?.id === task.assigned_to_id;
  const isReviewer = me && ["owner", "mis"].includes(me.role);
  const isManager = me && ["owner", "admin", "mis"].includes(me.role);
  const canAct = !["Approved", "Cancelled"].includes(task.status) && (isAssignee || isManager || !task.assigned_to_id);

  const requiredProof = task.required_proof_photos || 0;
  const imageRequired = (task.validations || []).includes("Image");
  const minPhotos = Math.max(requiredProof, imageRequired ? 1 : 0);
  const proofCount = (task.proof_photos || []).length;
  const pendingRequired = (task.checklist || []).filter((it) => it.required && !it.done);
  const needVideo = !!task.require_video_proof && !task.video_proof_uri;
  const needGeo = !!task.require_geo_tag_proof && !task.geo_tag_photo_uri;
  const canSubmit = pendingRequired.length === 0 && proofCount >= minPhotos && !needVideo && !needGeo;

  const submitDone = async () => {
    if (pendingRequired.length > 0) {
      toast.error(`${pendingRequired.length} required checklist item(s) pending: ${pendingRequired.map((i) => i.label).join(", ")}`);
      return;
    }
    if (proofCount < minPhotos) {
      toast.error(`Upload ${minPhotos} proof photo(s) required to submit (${proofCount} uploaded)`);
      return;
    }
    if (needVideo) { toast.error("Video proof is required to complete this task"); return; }
    if (needGeo) { toast.error("Geo-tag photo proof is required to complete this task"); return; }
    try {
      const completedAt = new Date();
      const due = task.due_date ? new Date(task.due_date) : null;
      const onTime = due ? completedAt <= due : true;
      const varianceMinutes = due ? Math.round((completedAt - due) / 60000) : null;
      await updateTask({ status: "Done", completed_at: completedAt.toISOString(), on_time: onTime, variance_minutes: varianceMinutes });
      await logAudit("Task Marked Done", task);
      toast.success(t("done"));
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-900 flex-1 truncate">{task.title}</h2>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColors[task.status]}`}>{t(task.status?.toLowerCase()?.replace(/\s/g, "")) || task.status}</span>
      </div>

      <div className="p-4 space-y-4">
        {task.description && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3 text-sm">
          <Row icon={UserIcon} label={t("assignTo")} value={task.assigned_to_name || "—"} />
          <Row icon={MapPin} label={t("location")} value={task.location_tag || "—"} />
          {task.start_date && <Row icon={Clock} label="Start" value={new Date(task.start_date).toLocaleString()} />}
          <Row icon={Clock} label={task.start_date ? "End" : t("dueDate")} value={task.due_date ? new Date(task.due_date).toLocaleString() : "—"} />
          <Row icon={CheckCircle2} label={t("priority")} value={task.priority} />
          {task.required_proof_photos > 0 && <Row icon={Camera} label={t("requiredPhotos")} value={`${task.required_proof_photos} (uploaded ${proofCount})`} />}
          {task.reminder_minutes ? <Row icon={Bell} label="Reminder" value={`${task.reminder_minutes} min before`} /> : null}
          {task.geo_fence && <Row icon={Shield} label="Geo Fence" value="Enabled" />}
          {task.buzzer && <Row icon={BellRing} label="Buzzer" value="On" />}
          {task.template_name && <Row icon={MessageSquare} label="Template" value={task.template_name} />}
        </div>

        {task.validations && task.validations.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-green-700" /> Validations Required</h3>
            <div className="flex flex-wrap gap-1.5">
              {task.validations.map((v) => (
                <span key={v} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">{v}</span>
              ))}
            </div>
          </div>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Sub Tasks</h3>
            <div className="space-y-2">
              {task.subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${st.done ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                    {st.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm ${st.done ? "line-through text-slate-400" : "text-slate-700"}`}>{st.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {task.checklist && task.checklist.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("checklist")}</h3>
            <div className="space-y-2">
              {task.checklist.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => canAct && toggleChecklist(idx)}
                  disabled={!canAct}
                  className="flex items-center gap-3 w-full text-left"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.done ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                    {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm ${item.done ? "line-through text-slate-400" : "text-slate-700"}`}>{item.label}</span>
                    {item.validations && item.validations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.validations.map((v) => (
                          <span key={v} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.required && <span className="text-[9px] font-bold text-red-500">REQ</span>}
                  {item.requires_photo && <Camera className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Proof photos */}
        {(minPhotos > 0 || proofCount > 0) && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">{t("photoProof")}</h3>
            <span className="text-[11px] text-slate-400">{proofCount}/5{minPhotos > 0 ? ` · ${minPhotos} required` : ""}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} alt={`proof ${i}`} className="w-full h-full object-cover rounded-lg" />
                {canAct && (
                  <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {canAct && proofCount < 5 && (
              <label className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-slate-400">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Add</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addPhoto} disabled={uploading} />
              </label>
            )}
          </div>
          {minPhotos > 0 && proofCount < minPhotos && (
            <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Upload {minPhotos - proofCount} more photo(s) to submit.</p>
          )}
        </div>
        )}

        {task.require_video_proof && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Video className="w-4 h-4 text-green-700" /> Video Proof</h3>
              <span className="text-[11px] text-slate-400">{task.video_proof_uri ? "Uploaded" : "Required"}</span>
            </div>
            {task.video_proof_uri && videoUrl ? (
              <div className="relative">
                <video src={videoUrl} controls className="w-full rounded-lg max-h-60 bg-black" />
                {canAct && (
                  <button onClick={() => updateTask({ video_proof_uri: "" })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : canAct ? (
              <label className="w-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 cursor-pointer hover:border-slate-400">
                {uploading ? <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> : <><Video className="w-6 h-6" /><span className="text-xs mt-1">Upload video</span></>}
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={addVideo} disabled={uploading} />
              </label>
            ) : (
              <p className="text-sm text-slate-400">Not uploaded</p>
            )}
          </div>
        )}

        {task.require_geo_tag_proof && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-700" /> Geo Tag Photo Proof</h3>
              <span className="text-[11px] text-slate-400">{task.geo_tag_photo_uri ? "Uploaded" : "Required"}</span>
            </div>
            {task.geo_tag_photo_uri && geoUrl ? (
              <div className="relative">
                <img src={geoUrl} alt="geo proof" className="w-full max-h-60 object-cover rounded-lg" />
                {canAct && (
                  <button onClick={() => updateTask({ geo_tag_photo_uri: "" })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : canAct ? (
              <label className="w-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 cursor-pointer hover:border-slate-400">
                {uploading ? <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> : <><Camera className="w-6 h-6" /><span className="text-xs mt-1">Upload geo-tag photo</span></>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addGeoPhoto} disabled={uploading} />
              </label>
            ) : (
              <p className="text-sm text-slate-400">Not uploaded</p>
            )}
          </div>
        )}

        {task.proof_note && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">{t("note")}</h3>
            <p className="text-sm text-slate-600">{task.proof_note}</p>
          </div>
        )}

        {task.reject_reason && (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <h3 className="text-sm font-semibold text-red-700 mb-1">{t("rejected")}</h3>
            <p className="text-sm text-red-600">{task.reject_reason}</p>
          </div>
        )}

        {/* Actions */}
        {canAct && (
          <div className="space-y-2">
            <button onClick={() => updateTask({ status: "In Progress" })} className="w-full bg-blue-100 text-blue-700 font-semibold py-3 rounded-2xl text-sm">
              {t("inProgress")}
            </button>
            <button
              onClick={submitDone}
              className={`w-full font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 ${canSubmit ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"}`}
            >
              {canSubmit ? (<><CheckCircle2 className="w-5 h-5" /> {t("markDone")}</>) : (<><AlertTriangle className="w-4 h-4" /> {t("submitBlocked")}</>)}
            </button>
            {!canSubmit && (
              <p className="text-[11px] text-slate-400 text-center">
                {pendingRequired.length > 0 ? `${pendingRequired.length} required item(s) pending`
                  : proofCount < minPhotos ? `Need ${minPhotos - proofCount} more photo(s)`
                  : needVideo ? "Video proof required"
                  : needGeo ? "Geo-tag photo required" : ""}
              </p>
            )}
          </div>
        )}

        {isReviewer && task.status === "Done" && !showReject && (
          <div className="space-y-2">
            <button onClick={handleApprove} className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> {t("approve")}
            </button>
            <button onClick={() => setShowReject(true)} className="w-full bg-red-100 text-red-700 font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5" /> {t("reject")}
            </button>
          </div>
        )}

        {showReject && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
              className="w-full text-sm p-3 border border-slate-200 rounded-xl min-h-[80px]"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-semibold">{t("cancel")}</button>
              <button onClick={handleReject} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-semibold">{t("reject")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-500"><Icon className="w-4 h-4" /> {label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}