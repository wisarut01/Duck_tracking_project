import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { errorMessage } from '@/api/client';
import {
  useCreatePageMutation,
  useDeletePageMutation,
  useLinkMutation,
  useMentionedIssues,
  usePage,
  usePageLinkedIssues,
  usePageTree,
  useSpace,
  useUnlinkMutation,
  useUpdatePageMutation,
  useUpdateSpaceMutation,
} from '@/api/queries';
import { findAncestorIds } from '@/components/docs/PageTree';
import { useToast } from '@/components/ui/Toast';
import { DocsPageScreen } from '@/screens/DocsPageScreen';
import { ErrorScreen, LoadingScreen } from './StatusScreens';

/**
 * /spaces/:spaceKey                → ไปหน้าแรกของ space
 * /spaces/:spaceKey/pages/:pageId  → เปิดหน้านั้น (?edit=1 = เปิดในโหมดแก้ไข เช่น หลังสร้างหน้าใหม่)
 */
export function DocsPage() {
  const { spaceKey = '', pageId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const space = useSpace(spaceKey);
  const tree = usePageTree(spaceKey);
  const page = usePage(pageId);
  const linkedIssues = usePageLinkedIssues(pageId);
  useMentionedIssues([page.data?.contentMd]);

  const createPage = useCreatePageMutation(spaceKey);
  const updatePage = useUpdatePageMutation();
  const deletePage = useDeletePageMutation(spaceKey);
  const updateSpace = useUpdateSpaceMutation(spaceKey);
  const link = useLinkMutation();
  const unlink = useUnlinkMutation();

  const pageUrl = (id: string) => `/spaces/${spaceKey}/pages/${id}`;

  // error แสดงเฉพาะตอนยังไม่มีข้อมูล: โหลดซ้ำพลาด (เช่นตอนกลับมาที่ tab แล้ว server ยังไม่ตื่น) ต้องไม่ปิด editor ที่เปิดอยู่
  if (space.error && !space.data) return <ErrorScreen error={space.error} onRetry={() => void space.refetch()} />;
  if (tree.error && !tree.data) return <ErrorScreen error={tree.error} onRetry={() => void tree.refetch()} />;
  if (page.error && !page.data) return <ErrorScreen error={page.error} onRetry={() => void page.refetch()} />;
  if (!space.data || !tree.data) return <LoadingScreen />;

  const firstPage = tree.data[0];
  if (!pageId && firstPage) return <Navigate to={pageUrl(firstPage.id)} replace />;

  return (
    <DocsPageScreen
      key={pageId} // เปลี่ยนหน้า → state ของ editor เริ่มใหม่
      space={space.data}
      tree={tree.data}
      page={page.data}
      loadingPage={Boolean(pageId) && page.isPending}
      linkedIssues={linkedIssues.data ?? []}
      loadingLinkedIssues={linkedIssues.isLoading}
      defaultEditing={params.get('edit') === '1'}
      onSelectPage={(id) => navigate(pageUrl(id))}
      onCreatePage={(parentId) =>
        createPage.mutate(
          { title: 'หน้าใหม่', parentId, contentMd: '' },
          {
            onSuccess: (created) => navigate(`${pageUrl(created.id)}?edit=1`),
            onError: (error) => toast({ tone: 'error', title: 'สร้างหน้าไม่สำเร็จ', description: errorMessage(error) }),
          },
        )
      }
      onSavePage={(changes) => updatePage.mutateAsync({ pageId: pageId!, changes })}
      onBackgroundSaveError={(error) =>
        toast({ tone: 'error', title: 'บันทึกหน้าไม่สำเร็จ', description: `ข้อความเก็บไว้ในเครื่องแล้ว เปิดหน้านี้อีกครั้งเพื่อบันทึกต่อ (${errorMessage(error)})` })
      }
      onFinishEditing={() => {
        if (params.has('edit')) navigate(pageUrl(pageId!), { replace: true });
      }}
      onRenamePage={async (id, title) => {
        await updatePage.mutateAsync({ pageId: id, changes: { title } }); // error → ฟอร์มโชว์ข้อความเอง
        toast({ tone: 'success', title: `เปลี่ยนชื่อเป็น “${title}” แล้ว` });
      }}
      onDeletePage={async (id) => {
        // เปิดหน้านี้หรือหน้าย่อยของมันอยู่ → ต้องออกจากหน้านั้น
        const openPageDeleted = id === pageId || Boolean(pageId && findAncestorIds(tree.data, pageId)?.includes(id));
        await deletePage.mutateAsync(id); // error → ฟอร์มโชว์ข้อความเอง
        toast({ tone: 'success', title: 'ลบหน้าแล้ว' });
        if (openPageDeleted) navigate(`/spaces/${spaceKey}`, { replace: true });
      }}
      onUpdateSpace={async (changes) => {
        await updateSpace.mutateAsync(changes); // error → ฟอร์มโชว์ข้อความเอง
        toast({ tone: 'success', title: 'บันทึก space แล้ว' });
      }}
      onLinkIssue={async (issue) => {
        await link.mutateAsync({ issueKey: issue.key, pageId: pageId! }); // error → หน้าเลือก issue โชว์เอง
        toast({ tone: 'success', title: `ลิงก์ ${issue.key} แล้ว` });
      }}
      onUnlinkIssue={(issueKey) =>
        unlink.mutate(
          { issueKey, pageId: pageId! },
          {
            onSuccess: () => toast({ tone: 'success', title: `ยกเลิกลิงก์ ${issueKey} แล้ว` }),
            onError: (error) => toast({ tone: 'error', title: 'ยกเลิกลิงก์ไม่สำเร็จ', description: errorMessage(error) }),
          },
        )
      }
    />
  );
}
