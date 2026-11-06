// Included ONLY in the instrumented lifecycle source, never the compiler supervisor.
public static class TestHooks {
  public static string Root,PauseAt,Fault;
  static int pumpStarts;
  public static void BeforePumpStart() {int n=System.Threading.Interlocked.Increment(ref pumpStarts);if((n==1&&Fault=="first-pump-start")||(n==2&&Fault=="second-pump-start"))throw new System.IO.IOException("injected-"+Fault+"-after-thread-allocation");}
  public static void Point(string name,uint pid=0) {
    string published=System.IO.Path.Combine(Root,"point-"+name+".txt");
    string staging=published+".pending";
    using(var f=new System.IO.FileStream(staging,System.IO.FileMode.CreateNew,System.IO.FileAccess.Write,System.IO.FileShare.None)) {
      byte[] b=System.Text.Encoding.ASCII.GetBytes(pid.ToString()+"\n");f.Write(b,0,b.Length);f.Flush(true);
    }
    System.IO.File.Move(staging,published);
    if(PauseAt==name)while(!System.IO.File.Exists(System.IO.Path.Combine(Root,"release-"+name+".txt")))System.Threading.Thread.Sleep(10);
  }
  public static void Fail(string name) {if(Fault==name)throw new System.IO.IOException("injected-"+name);}
}
