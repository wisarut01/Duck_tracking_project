import { errorMessage } from '@/api/client';
import {
  useAddCommentMutation,
  useDeleteCommentMutation,
  useDeleteIssueMutation,
  useLinkMutation,
  useMoveIssueMutation,
  useUnlinkMutation,
  useUpdateCommentMutation,
  useUpdateIssueMutation,
} from '@/api/queries';
import type { IssueActions } from '@/components/issues/IssueDetailPanel';
import { useToast } from '@/components/ui/Toast';
import type { Issue } from '@/types/api';

/** ต่อปุ่มต่างๆ ใน IssueDetailPanel เข้ากับ API — ใช้ทั้ง drawer บน board และหน้า issue */
export function useIssueActions(issue: Issue | undefined, { onDeleted }: { onDeleted?: () => void } = {}): IssueActions {
  const toast = useToast();
  const issueKey = issue?.key ?? '';
  const update = useUpdateIssueMutation();
  const removeIssue = useDeleteIssueMutation();
  const editComment = useUpdateCommentMutation(issueKey);
  const removeComment = useDeleteCommentMutation(issueKey);
  const move = useMoveIssueMutation(issue?.projectKey ?? '');
  const addComment = useAddCommentMutation(issueKey);
  const link = useLinkMutation();
  const unlink = useUnlinkMutation();

  if (!issue) return {};
  const onError = (title: string) => (error: unknown) => toast({ tone: 'error', title, description: errorMessage(error) });

  return {
    onUpdate: (changes) => update.mutate({ issueKey, changes }, { onError: onError(`แก้ไข ${issueKey} ไม่สำเร็จ`) }),
    onDeleteIssue: async () => {
      await removeIssue.mutateAsync(issueKey); // error → ฟอร์มยืนยันโชว์ข้อความเอง
      toast({ tone: 'success', title: `ลบ ${issueKey} แล้ว` });
      onDeleted?.();
    },
    onStatusChange: (status) =>
      move.mutate({ issueKey, move: { status } }, { onError: onError(`ย้าย ${issueKey} ไม่สำเร็จ`) }),
    onAddComment: (body) => addComment.mutate(body, { onError: onError('ส่ง comment ไม่สำเร็จ') }),
    onEditComment: (commentId, body) => editComment.mutateAsync({ commentId, body }), // error → กล่องแก้ไขโชว์ข้อความเอง
    onDeleteComment: async (commentId) => {
      await removeComment.mutateAsync(commentId); // error → ฟอร์มยืนยันโชว์ข้อความเอง
      toast({ tone: 'success', title: 'ลบ comment แล้ว' });
    },
    // mutateAsync → ถ้า error, LinkPickerModal โชว์ข้อความเองและเปิดค้างไว้
    onLinkPage: async (page) => {
      await link.mutateAsync({ issueKey, pageId: page.id });
      toast({ tone: 'success', title: `ลิงก์ “${page.title}” แล้ว` });
    },
    onUnlinkPage: (pageId) =>
      unlink.mutate(
        { issueKey, pageId },
        { onSuccess: () => toast({ tone: 'success', title: 'ยกเลิกลิงก์แล้ว' }), onError: onError('ยกเลิกลิงก์ไม่สำเร็จ') },
      ),
  };
}
