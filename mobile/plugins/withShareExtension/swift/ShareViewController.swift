// "Make a song about this" iOS Share Extension.
//
// Receives a URL / text / image from the share sheet, drops it into a shared
// App Group container that the main app polls on launch, then closes the
// extension. The main app reads the pending payload, navigates to the
// generation screen, and pre-fills the prompt.
//
// Why a shared container instead of an URL deeplink? Two reasons:
//   1. The deeplink approach can't carry images.
//   2. iOS doesn't always wake the host app cleanly from an extension —
//      writing to disk + polling on next launch is the rock-solid pattern.

import UIKit
import Social
import UniformTypeIdentifiers

@objc(ShareViewController)
class ShareViewController: SLComposeServiceViewController {

  // Replace at build time via the config plugin to match the app group.
  private let appGroupID = "group.com.worldofz.makeyourmusic"

  override func isContentValid() -> Bool {
    return !(contentText?.isEmpty ?? true) || hasAttachments
  }

  private var hasAttachments: Bool {
    let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
    return items.contains(where: { ($0.attachments ?? []).isEmpty == false })
  }

  override func didSelectPost() {
    let payload = NSMutableDictionary()
    payload["text"] = contentText ?? ""
    payload["createdAt"] = ISO8601DateFormatter().string(from: Date())

    let dispatch = DispatchGroup()
    var urls: [String] = []
    var imagePaths: [String] = []

    for item in (extensionContext?.inputItems as? [NSExtensionItem]) ?? [] {
      for attachment in item.attachments ?? [] {
        if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          dispatch.enter()
          attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { (data, _) in
            if let url = data as? URL { urls.append(url.absoluteString) }
            dispatch.leave()
          }
        }
        if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
          dispatch.enter()
          attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (data, _) in
            defer { dispatch.leave() }
            guard let self = self,
                  let appGroupURL = FileManager.default.containerURL(
                    forSecurityApplicationGroupIdentifier: self.appGroupID) else { return }
            var imageData: Data?
            if let url = data as? URL { imageData = try? Data(contentsOf: url) }
            else if let img = data as? UIImage { imageData = img.jpegData(compressionQuality: 0.85) }
            else if let d = data as? Data { imageData = d }
            guard let bytes = imageData else { return }
            let filename = "share-\(UUID().uuidString).jpg"
            let dest = appGroupURL.appendingPathComponent(filename)
            try? bytes.write(to: dest)
            imagePaths.append(filename)
          }
        }
      }
    }

    dispatch.notify(queue: .main) { [weak self] in
      guard let self = self,
            let appGroupURL = FileManager.default.containerURL(
              forSecurityApplicationGroupIdentifier: self.appGroupID) else {
        self?.extensionContext?.completeRequest(returningItems: nil)
        return
      }
      payload["urls"] = urls
      payload["images"] = imagePaths
      let dest = appGroupURL.appendingPathComponent("share-pending.json")
      try? JSONSerialization.data(withJSONObject: payload, options: []).write(to: dest)
      self.extensionContext?.completeRequest(returningItems: nil) { _ in
        // Best-effort: open the host app via the URL scheme so the user lands
        // straight on the generation screen. iOS may decline; that's fine —
        // the next time they open the app, the pending payload is still there.
        if let url = URL(string: "makeyourmusic://share?source=extension") {
          self.openURL(url)
        }
      }
    }
  }

  override func configurationItems() -> [Any]! { return [] }

  // openURL on a NSExtensionContext-only Swift app requires walking the
  // responder chain to find a UIApplication. Standard extension trick.
  @objc private func openURL(_ url: URL) {
    var responder: UIResponder? = self
    while responder != nil {
      if let app = responder as? UIApplication {
        app.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = responder?.next
    }
  }
}
