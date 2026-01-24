import ERPLayout from '@/components/erp/ERPLayout';

export default function ERPLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ERPLayout>{children}</ERPLayout>;
}
