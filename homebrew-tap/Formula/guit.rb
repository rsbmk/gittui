class Guit < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/guit-cli/guit"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER"
    else
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER"
    else
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-linux-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  def install
    bin.install "guit"
  end

  test do
    assert_match "guit", shell_output("#{bin}/guit --version")
  end
end
