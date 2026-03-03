class Gittui < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/rsbmk/gittui"
  version "0.1.4"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-darwin-arm64.tar.gz"
      sha256 "fa6b41d7f8a843f1d4a281bad1956462a03b7f40f4d0fec6f79b67c534acb1e4"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-arm64.tar.gz"
      sha256 "f46963eaa6f663f550f9c2dce91d8871d0f5845d63af843669f910cf9900ae07"
    end

    on_intel do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-x64.tar.gz"
      sha256 "7d5a24f660cf5e971aa1d16a8e9e3fe87981681d9fc8395cb2d7fe119a04a745"
    end
  end

  def install
    bin.install "gittui"
  end

  test do
    assert_match "gittui", shell_output("#{bin}/gittui --version")
  end
end
