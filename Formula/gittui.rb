class Gittui < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/rsbmk/gittui"
  version "0.1.1"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-darwin-arm64.tar.gz"
      sha256 "aa41e237e9167f7c26ff0dd24ecb619aad91a6b54eedd7d5ae278e1024d2c86a"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-arm64.tar.gz"
      sha256 "9a270b54c93e6ec738b070b643af440f192c32d83689a5f9573df644a752fd7d"
    end

    on_intel do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-x64.tar.gz"
      sha256 "d3e14d7f4d8064498199e0e39a4ce8cb9a4c03d98373601922a80fabb6376c87"
    end
  end

  def install
    bin.install "gittui"
  end

  test do
    assert_match "gittui", shell_output("#{bin}/gittui --version")
  end
end
