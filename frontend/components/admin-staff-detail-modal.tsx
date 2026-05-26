"use client";

import { X, User, Mail, Shield, Award, Hash, Calendar, Star  } from "lucide-react";
import type { StaffRecord, StaffRoleName } from "@/types/leave-app";
import { findRoleName } from "@/lib/leave-app-helpers";

const roleLabelByName: Record<StaffRoleName, string> = {
  ADMIN: "Admin",
  HEAD: "Trưởng phòng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};

const badgeStylesByRole: Record<StaffRoleName, string> = {
  ADMIN: "bg-slate-950 text-white border-slate-950",
  HEAD: "bg-amber-50 text-amber-700 border-amber-200/60",
  MANAGER: "bg-purple-50 text-purple-700 border-purple-200/60",
  STAFF: "bg-slate-50 text-slate-700 border-slate-200/60",
};

interface AdminStaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStaff: StaffRecord | undefined;
  isLoadingStaffDetail: boolean;
}

export function AdminStaffDetailModal({
  isOpen,
  onClose,
  selectedStaff,
  isLoadingStaffDetail,
}: AdminStaffDetailModalProps) {
  if (!isOpen) return null;
 
  

  
  const initials = selectedStaff?.fullName
    ? selectedStaff.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "US";

  const roleName = selectedStaff ? findRoleName(selectedStaff) : "STAFF";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 transition-all duration-300 animate-modal-fade"
      role="dialog"
      aria-modal="true"
    >
     
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-fade {
          animation: modalFadeIn 0.2s ease-out forwards;
        }
        .animate-modal-scale {
          animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="absolute inset-0 bg-transparent animate-modal-fade" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-modal-scale">
        {/* Header section */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Thông tin nhân sự</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">Chi tiết từ dữ liệu máy chủ.</p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
            onClick={onClose}
            type="button"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>


        {isLoadingStaffDetail ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
            <p className="text-xs font-medium text-slate-500">Đang tải dữ liệu...</p>
          </div>
        ) : selectedStaff ? (
          <div className="mt-5 grid gap-4">
          
            <div className="flex items-center gap-4 bg-slate-50/50 rounded-xl border border-slate-100 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-inner">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-950 truncate leading-snug">
                  {selectedStaff.fullName}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {selectedStaff.email}
                </p>
              </div>
            </div>

            <div className="grid gap-3.5 text-sm">
          
              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Họ và tên
                </span>
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-850">{selectedStaff.fullName}</span>
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Địa chỉ Email
                </span>
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-850 truncate">{selectedStaff.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
            
                <div className="grid gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Vai trò hệ thống
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-150/60 bg-white px-2.5 py-2 text-slate-900 shadow-sm">
                    <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${badgeStylesByRole[roleName] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      {roleLabelByName[roleName] || roleName}
                    </span>
                  </div>
                </div>

              
                <div className="grid gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ngày phép còn lại
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <Award className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900">{selectedStaff.leaveCredit} ngày</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Staff ID */}
                <div className="grid gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Mã nhân sự (ID)
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-600">{selectedStaff.id}</span>
                  </div>
                </div>

                 
                <div className="grid gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ngày khởi tạo tài khoản
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-650 font-medium whitespace-nowrap">
                      {new Date(selectedStaff.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                {/* <div className="grid gap-1.5 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ngày phép khởi đầu
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-150/60 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <Star className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900">{selectedStaff.leaveCredit} ngày</span>
                    <span className="ml-auto text-[10px] font-medium text-slate-400">
                      Số ngày được cấp ban đầu
                    </span>
                  </div>
                </div> */}
              </div>
            </div>

             
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            Không tìm thấy thông tin nhân sự.
          </div>
        )}
      </div>
    </div>
  );
}
