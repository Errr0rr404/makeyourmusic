import { ManageDeveloperApp } from './ManageClient';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ManageDeveloperApp id={id} />;
}
