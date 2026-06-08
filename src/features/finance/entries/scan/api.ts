export async function scanReceipt(file: File): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/entries/scan", {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Scan failed");
  return json.data;
}
