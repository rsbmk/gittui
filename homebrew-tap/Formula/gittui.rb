class Gittui < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/rsbmk/gittui"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-darwin-arm64.tar.gz"
      sha256 "5e2b2fb9465221dcc08f98c3335826b57d35c645044a37719246bc5d7f50b5dc"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-arm64.tar.gz"
      sha256 "9c4c8bbaef2c33b67f3d2fce685364fe202d33c2c8ef9b3f770f0820b4bd021c"
    end

    on_intel do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-x64.tar.gz"
      sha256 "b60ae6ff8ea29bb336032b57321459028163715b48396447b1f21110b3048af5"
    end
  end

  def install
    bin.install "gittui"
  end

  test do
    assert_match "gittui", shell_output("#{bin}/gittui --version")
  end
end
