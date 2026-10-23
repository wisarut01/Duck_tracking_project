import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { errorMessage } from '@/api/client';
import {
  useCreatePageMutation,
  useMentionedIssues,
  usePage,
  usePageLinkedIssues,
  usePageTree,
  useSpace,
  useUnlinkMutation,
  useUpdatePageMutation,
} from '@/api/queries';
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
  const updatePage = useUpdatePageMutation(pageId ?? '');
  const unlink = useUnlinkMutation();

  const pageUrl = (id: string) => `/spaces/${spaceKey}/pages/${id}`;

  if (space.error) return <ErrorScreen error={space.error} onRetry={() => void space.refetch()} />;
  if (page.error) return <ErrorScreen error={page.error} onRetry={() => void page.refetch()} />;
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
      onSavePage={async (changes) => {
        try {
          await updatePage.mutateAsync(changes);
        } catch (error) {
          toast({ tone: 'error', title: 'บันทึกไม่สำเร็จ', description: errorMessage(error) });
          throw error; // ให้ editor เปิดค้างไว้
        }
        toast({ tone: 'success', title: 'บันทึกหน้าแล้ว' });
        if (params.has('edit')) navigate(pageUrl(pageId!), { replace: true });
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
