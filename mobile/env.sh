# Source this file before Flutter/Android commands:
#   source mobile/env.sh

export FLUTTER_ROOT="$HOME/development/flutter"
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home 2>/dev/null || echo /Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home)}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

export PATH="$FLUTTER_ROOT/bin:$PATH"
export PATH="$JAVA_HOME/bin:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
export PATH="/opt/homebrew/lib/ruby/gems/3.0.0/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"
