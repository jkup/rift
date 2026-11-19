// Proposed independent safety observer. Never opens/duplicates the inner job.
// Its outer job remains alive while testing inner-job last-handle cleanup, so
// a broken inner supervisor leaves a detectable survivor rather than a leak.
using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.ComponentModel;
using System.Runtime.InteropServices;
public sealed class LifecycleObserver : IDisposable {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SI {public int Size;public string Reserved,Desktop,Title;public int X,Y,Xs,Ys,Xc,Yc,Fill,Flags;public short Show,Count;public IntPtr ReservedBytes,Input,Output,Error;}
 [StructLayout(LayoutKind.Sequential)] struct SIX {public SI Start;public IntPtr Attributes;}
 [StructLayout(LayoutKind.Sequential)] struct PI {public IntPtr Process,Thread;public uint Pid,Tid;}
 [StructLayout(LayoutKind.Sequential)] struct BL {public long P,J;public uint Flags;public UIntPtr Min,Max;public uint Active;public UIntPtr Affinity;public uint Priority,Schedule;}
 [StructLayout(LayoutKind.Sequential)] struct IO {public ulong A,B,C,D,E,F;}
 [StructLayout(LayoutKind.Sequential)] struct EL {public BL Basic;public IO Io;public UIntPtr A,B,C,D;}
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObjectW(IntPtr sa,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr j,int cls,ref EL info,uint bytes);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr j,int cls,IntPtr info,uint size,IntPtr length);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr a,int count,int flags,ref IntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr a,uint flags,IntPtr key,IntPtr value,IntPtr size,IntPtr previous,IntPtr length);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr p);
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool CreateProcessW(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SIX si,out PI pi);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateJobObject(IntPtr j,uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr p,uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint WaitForSingleObject(IntPtr p,uint ms);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr t);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
 IntPtr job;PI pi;public uint Pid {get{return pi.Pid;}}public bool FallbackUsed {get;private set;}
 static void Need(bool b,string stage){if(!b)throw new Win32Exception(Marshal.GetLastWin32Error(),stage);}
 static string Q(string s){var b=new StringBuilder("\"");int n=0;foreach(char c in s){if(c=='\\'){n++;continue;}b.Append('\\',c=='"'?n*2+1:n).Append(c);n=0;}return b.Append('\\',n*2).Append('"').ToString();}
 public LifecycleObserver(){if(!OperatingSystem.IsWindowsVersionAtLeast(10))throw new PlatformNotSupportedException();job=CreateJobObjectW(IntPtr.Zero,null);Need(job!=IntPtr.Zero,"observer-job");try{var limit=new EL();limit.Basic.Flags=0x2000;Need(SetInformationJobObject(job,9,ref limit,(uint)Marshal.SizeOf<EL>()),"observer-limits");}catch{CloseHandle(job);job=IntPtr.Zero;throw;}}
 public void Start(string exe,string[] args,string[] pairs,string cwd){if(pi.Process!=IntPtr.Zero)throw new Exception("one-supervisor-only");IntPtr a=IntPtr.Zero,list=IntPtr.Zero,env=IntPtr.Zero;bool ready=false;
  try{IntPtr size=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);Need(size!=IntPtr.Zero,"observer-attribute-size");a=Marshal.AllocHGlobal(size);Need(InitializeProcThreadAttributeList(a,1,0,ref size),"observer-attributes");ready=true;
   list=Marshal.AllocHGlobal(IntPtr.Size);Marshal.WriteIntPtr(list,job);Need(UpdateProcThreadAttribute(a,0,new IntPtr(0x2000d),list,new IntPtr(IntPtr.Size),IntPtr.Zero,IntPtr.Zero),"observer-job-list");
   Array.Sort(pairs,StringComparer.OrdinalIgnoreCase);env=Marshal.StringToHGlobalUni(String.Join("\0",pairs)+"\0\0");var si=new SIX();si.Start.Size=Marshal.SizeOf<SIX>();si.Attributes=a;var command=new StringBuilder(Q(exe));foreach(string arg in args)command.Append(' ').Append(Q(arg));
   bool ok=CreateProcessW(exe,command,IntPtr.Zero,IntPtr.Zero,false,0x08080404,env,cwd,ref si,out pi);if(!ok){int error=Marshal.GetLastWin32Error();pi=new PI();throw new Win32Exception(error,"observer-create");}
   Need(ResumeThread(pi.Thread)!=0xffffffff,"observer-resume");CloseHandle(pi.Thread);pi.Thread=IntPtr.Zero;
  }finally{if(ready)DeleteProcThreadAttributeList(a);if(a!=IntPtr.Zero)Marshal.FreeHGlobal(a);if(list!=IntPtr.Zero)Marshal.FreeHGlobal(list);if(env!=IntPtr.Zero)Marshal.FreeHGlobal(env);}
 }
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool member);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool QueryFullProcessImageNameW(IntPtr process,uint flags,StringBuilder name,ref uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr process,out long created,out long exited,out long kernel,out long user);
 readonly System.Collections.Generic.Dictionary<uint,IntPtr> observed=new System.Collections.Generic.Dictionary<uint,IntPtr>();
 public sealed class Identity {public uint Pid {get;set;} public string Created {get;set;} public string Image {get;set;}}
 public Identity CaptureMember(uint pid) {
  if(observed.ContainsKey(pid))throw new Exception("duplicate-observed-pid");
  IntPtr handle=OpenProcess(0x00101000,false,pid);Need(handle!=IntPtr.Zero,"observer-open-member");
  try {
   bool member;Need(IsProcessInJob(handle,job,out member),"observer-member-check");if(!member)throw new Exception("observer-process-not-in-outer-job");
   uint wait=WaitForSingleObject(handle,0);if(wait!=258)throw new Exception("observer-member-not-live: "+wait);
   uint size=32768;var name=new StringBuilder((int)size);Need(QueryFullProcessImageNameW(handle,0,name,ref size),"observer-member-image");
   long created,exited,kernel,user;Need(GetProcessTimes(handle,out created,out exited,out kernel,out user),"observer-member-times");
   observed.Add(pid,handle);handle=IntPtr.Zero;return new Identity {Pid=pid,Created=created.ToString(System.Globalization.CultureInfo.InvariantCulture),Image=name.ToString()};
  }finally{if(handle!=IntPtr.Zero)CloseHandle(handle);}
 }
 public bool WaitMember(uint pid,int ms){uint r=WaitForSingleObject(observed[pid],(uint)ms);if(r==0)return true;if(r==258)return false;throw new Win32Exception(Marshal.GetLastWin32Error(),"observer-member-wait");}
 public uint MemberExit(uint pid){if(!WaitMember(pid,0))throw new Exception("observer-member-still-running");uint code;Need(GetExitCodeProcess(observed[pid],out code),"observer-member-exit");return code;}
 public void KillRoot(){Need(pi.Process!=IntPtr.Zero,"observer-no-root");Need(TerminateProcess(pi.Process,0xe0350010),"observer-kill-root-only");}
 public bool WaitRoot(int ms){uint r=WaitForSingleObject(pi.Process,(uint)ms);if(r==0)return true;if(r==258)return false;throw new Win32Exception(Marshal.GetLastWin32Error(),"observer-wait");}
 public ulong[] Members(){int size=8+IntPtr.Size*1024;IntPtr b=Marshal.AllocHGlobal(size);try{Need(QueryInformationJobObject(job,3,b,(uint)size,IntPtr.Zero),"observer-member-query");int assigned=Marshal.ReadInt32(b),count=Marshal.ReadInt32(b,4);if(count<0||count>1024||assigned!=count)throw new Exception("observer-incomplete-member-list");var ids=new ulong[count];for(int i=0;i<count;i++)ids[i]=unchecked((ulong)Marshal.ReadIntPtr(b,8+i*IntPtr.Size).ToInt64());return ids;}finally{Marshal.FreeHGlobal(b);}}
 public bool WaitEmpty(int ms){var clock=Stopwatch.StartNew();do{if(Members().Length==0)return true;Thread.Sleep(10);}while(clock.ElapsedMilliseconds<ms);return Members().Length==0;}
 public void SafetyCleanup(){FallbackUsed=true;Need(TerminateJobObject(job,0xe0350011),"observer-safety-terminate");if(!WaitEmpty(10000))throw new Exception("observer-safety-cleanup-unconfirmed");}
 public void Dispose(){foreach(var handle in observed.Values)CloseHandle(handle);observed.Clear();if(job!=IntPtr.Zero){CloseHandle(job);job=IntPtr.Zero;}if(pi.Thread!=IntPtr.Zero){CloseHandle(pi.Thread);pi.Thread=IntPtr.Zero;}if(pi.Process!=IntPtr.Zero){CloseHandle(pi.Process);pi.Process=IntPtr.Zero;}}
}
