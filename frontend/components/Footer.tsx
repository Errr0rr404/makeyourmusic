'use client';

export default function FooterContent() {
  const storeName = 'ERP Platform';

  return (
    <footer className="border-t bg-muted/50 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border-t mt-8 pt-8">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
