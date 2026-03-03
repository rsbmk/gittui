class Gittui < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/rsbmk/gittui"
  version "0.1.2"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-darwin-arm64.tar.gz"
      sha256 "3f8802bf730d821c5a036a4d663ddc6e717c6e2c600a18b48b0d5abfd9e6651a"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-arm64.tar.gz"
      sha256 "d3562326eba308e4328e6ef201805730b6bd84453dd422cfad39d89196c5802a"
    end

    on_intel do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-x64.tar.gz"
      sha256 "070c1b4e65e4ff9bdd2228dd240bc84db4f4c8292714e0f3323cb1a0419e1b2e"
    end
  end

  def install
    bin.install "gittui"
  end

  test do
    assert_match "gittui", shell_output("#{bin}/gittui --version")
  end
end
