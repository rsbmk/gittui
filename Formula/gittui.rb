class Gittui < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/rsbmk/gittui"
  version "0.1.3"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-darwin-arm64.tar.gz"
      sha256 "a1867041083ad2c024d4ab497798978682d38315c68b396d97d2741b306b4982"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-arm64.tar.gz"
      sha256 "492f9a14162ccdd38b9d8fbf36afa3e7f360d863ab409091ee3f3d01a23410cf"
    end

    on_intel do
      url "https://github.com/rsbmk/gittui/releases/download/v#{version}/gittui-linux-x64.tar.gz"
      sha256 "68d1461860e84dd38424da665322a421e913351b22d9bc146cfbfe83dc3de2ba"
    end
  end

  def install
    bin.install "gittui"
  end

  test do
    assert_match "gittui", shell_output("#{bin}/gittui --version")
  end
end
