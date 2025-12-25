// LaTeX模板库数据
/* eslint-disable no-useless-escape */

export interface LatexTemplateItem {
  name: string;
  formula: string;
}

export interface LatexTemplateCategory {
  name: string;
  items: LatexTemplateItem[];
}

export const latexTemplates: LatexTemplateCategory[] = [
  {
    'name': 'Basic Mathematics',
    'items': [
      { 'name': 'Quadratic Formula', 'formula': 'x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}' },
      { 'name': 'Pythagorean Theorem', 'formula': 'a^2 + b^2 = c^2' },
      { 'name': 'Sum of Series', 'formula': '\sum_{i=1}^{n} i = \frac{n(n+1)}{2}' },
      { 'name': 'Binomial Theorem', 'formula': '(a + b)^n = \sum_{k=0}^{n} \binom{n}{k} a^{n-k} b^k' },
      { 'name': 'Geometric Series', 'formula': '\sum_{n=0}^{\infty} ar^n = \frac{a}{1-r} \quad |r| < 1' },
      { 'name': 'Logarithm Identity', 'formula': '\log(ab) = \log(a) + \log(b)' },
      { 'name': 'Exponential Identity', 'formula': 'e^{\ln(x)} = x' },
      { 'name': 'Trigonometric Identity', 'formula': '\sin^2(x) + \cos^2(x) = 1' },
      { 'name': 'Double Angle Formula', 'formula': '\sin(2x) = 2\sin(x)\cos(x)' },
      { 'name': 'Law of Cosines', 'formula': 'c^2 = a^2 + b^2 - 2ab\cos(C)' },
      { 'name': 'Arithmetic Mean', 'formula': '\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i' },
      { 'name': 'Harmonic Mean', 'formula': 'H = \frac{n}{\sum_{i=1}^{n} \frac{1}{x_i}}' },
      { 'name': 'Power Rule', 'formula': 'x^a x^b = x^{a+b}' },
      { 'name': 'Root Identity', 'formula': '\sqrt[n]{ab} = \sqrt[n]{a} \sqrt[n]{b}' }
    ]
  },
  {
    'name': 'Calculus',
    'items': [
      { 'name': 'Derivative', 'formula': '\frac{d}{dx} f(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}' },
      { 'name': 'Integral', 'formula': '\int_{a}^{b} f(x) \, dx' },
      { 'name': 'Chain Rule', 'formula': '\frac{d}{dx} f(g(x)) = f\'(g(x)) \cdot g\'(x)' },
      { 'name': 'Product Rule', 'formula': '\frac{d}{dx} [f(x)g(x)] = f\'(x)g(x) + f(x)g\'(x)' },
      { 'name': 'Quotient Rule', 'formula': '\frac{d}{dx} \left(\frac{f(x)}{g(x)}\right) = \frac{f\'(x)g(x) - f(x)g\'(x)}{[g(x)]^2}' },
      { 'name': 'Fundamental Theorem of Calculus', 'formula': '\frac{d}{dx} \int_{a}^{x} f(t) \, dt = f(x)' },
      { 'name': 'Partial Derivative', 'formula': '\frac{\partial f(x,y)}{\partial x}' },
      { 'name': 'Gradient', 'formula': '\nabla f = \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}, \frac{\partial f}{\partial z}\right)' },
      { 'name': 'Laplacian', 'formula': '\nabla^2 f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2} + \frac{\partial^2 f}{\partial z^2}' },
      { 'name': 'Taylor Series', 'formula': 'f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!} (x-a)^n' },
      { 'name': 'Riemann Sum', 'formula': '\int_{a}^{b} f(x) \, dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i^*) \Delta x' },
      { 'name': 'Divergence', 'formula': '\nabla \cdot \mathbf{F} = \frac{\partial F_x}{\partial x} + \frac{\partial F_y}{\partial y} + \frac{\partial F_z}{\partial z}' },
      { 'name': 'Curl', 'formula': '\nabla \times \mathbf{F} = \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\ \frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z} \\ F_x & F_y & F_z \end{vmatrix}' },
      { 'name': 'Green\'s Theorem', 'formula': '\oint_C (P dx + Q dy) = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right) dA' },
      { 'name': 'Stokes\' Theorem', 'formula': '\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}' },
      { 'name': 'Divergence Theorem', 'formula': '\oiint_S \mathbf{F} \cdot d\mathbf{S} = \iiint_V (\nabla \cdot \mathbf{F}) dV' }
    ]
  },
  {
    'name': 'Linear Algebra',
    'items': [
      { 'name': 'Matrix Multiplication', 'formula': 'C_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}' },
      { 'name': 'Determinant', 'formula': '\det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc' },
      { 'name': 'Eigenvalue Equation', 'formula': 'A v = \lambda v' },
      { 'name': 'Trace', 'formula': '\text{tr}(A) = \sum_{i=1}^{n} A_{ii}' },
      { 'name': 'Inverse Matrix', 'formula': 'A^{-1} = \frac{1}{\det(A)} \text{adj}(A)' },
      { 'name': 'Vector Dot Product', 'formula': '\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i' },
      { 'name': 'Vector Cross Product', 'formula': '\mathbf{a} \times \mathbf{b} = \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\ a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \end{vmatrix}' },
      { 'name': 'Singular Value Decomposition', 'formula': 'A = U \Sigma V^T' },
      { 'name': 'Gram-Schmidt Process', 'formula': 'u_i = v_i - \sum_{j=1}^{i-1} \frac{\langle v_i, u_j \rangle}{\langle u_j, u_j \rangle} u_j' },
      { 'name': 'LU Decomposition', 'formula': 'A = LU' },
      { 'name': 'QR Decomposition', 'formula': 'A = QR' },
      { 'name': 'Frobenius Norm', 'formula': '\|A\|_F = \sqrt{\sum_{i=1}^{m} \sum_{j=1}^{n} |A_{ij}|^2}' },
      { 'name': 'Rank-Nullity Theorem', 'formula': '\text{rank}(A) + \text{nullity}(A) = n' },
      { 'name': 'Cayley-Hamilton Theorem', 'formula': 'p(A) = 0' },
      { 'name': 'Matrix Exponential', 'formula': 'e^A = \sum_{n=0}^{\infty} \frac{A^n}{n!}' }
    ]
  },
  {
    'name': 'Physics',
    'items': [
      { 'name': 'Newton\'s Second Law', 'formula': 'F = ma' },
      { 'name': 'Einstein\'s Mass-Energy Equivalence', 'formula': 'E = mc^2' },
      { 'name': 'Maxwell\'s Equations', 'formula': '\nabla \cdot E = \frac{\rho}{\epsilon_0}' },
      { 'name': 'Schrödinger Equation', 'formula': 'i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r},t) = \hat{H} \Psi(\mathbf{r},t)' },
      { 'name': 'Heisenberg Uncertainty Principle', 'formula': '\Delta x \Delta p \geq \frac{\hbar}{2}' },
      { 'name': 'Planck\'s Law', 'formula': 'E = hf' },
      { 'name': 'Boltzmann Distribution', 'formula': 'P(E) = \frac{1}{Z} e^{-\beta E}' },
      { 'name': 'Lorentz Force', 'formula': '\mathbf{F} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B})' },
      { 'name': 'Newton\'s Law of Gravitation', 'formula': 'F = G \frac{m_1 m_2}{r^2}' },
      { 'name': 'Hooke\'s Law', 'formula': 'F = -kx' },
      { 'name': 'Conservation of Energy', 'formula': 'E = K + U = \text{constant}' },
      { 'name': 'Ohm\'s Law', 'formula': 'V = IR' },
      { 'name': 'Fourier Transform', 'formula': 'F(\omega) = \int_{-\infty}^{\infty} f(t) e^{-i\omega t} dt' },
      { 'name': 'Lagrangian', 'formula': '\mathcal{L} = T - V' },
      { 'name': 'Hamiltonian', 'formula': '\mathcal{H} = T + V' },
      { 'name': 'Navier-Stokes Equation', 'formula': '\rho \left(\frac{\partial \mathbf{u}}{\partial t} + \mathbf{u} \cdot \nabla \mathbf{u}\right) = -\nabla p + \mu \nabla^2 \mathbf{u} + \mathbf{f}' }
    ]
  },
  {
    'name': 'Statistics & Probability',
    'items': [
      { 'name': 'Mean', 'formula': '\mu = \frac{1}{n} \sum_{i=1}^{n} x_i' },
      { 'name': 'Variance', 'formula': '\sigma^2 = \frac{1}{n-1} \sum_{i=1}^{n} (x_i - \mu)^2' },
      { 'name': 'Standard Deviation', 'formula': '\sigma = \sqrt{\sigma^2}' },
      { 'name': 'Probability Density Function', 'formula': 'P(a \leq X \leq b) = \int_{a}^{b} f(x) \, dx' },
      { 'name': 'Gaussian Distribution', 'formula': 'f(x) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}' },
      { 'name': 'Bayes Theorem', 'formula': 'P(A|B) = \frac{P(B|A) P(A)}{P(B)}' },
      { 'name': 'Correlation Coefficient', 'formula': 'r = \frac{\sum (x_i - \mu_x)(y_i - \mu_y)}{\sqrt{\sum (x_i - \mu_x)^2 \sum (y_i - \mu_y)^2}}' },
      { 'name': 'Poisson Distribution', 'formula': 'P(k) = \frac{e^{-\lambda} \lambda^k}{k!}' },
      { 'name': 'Binomial Distribution', 'formula': 'P(k) = \binom{n}{k} p^k (1-p)^{n-k}' },
      { 'name': 'Central Limit Theorem', 'formula': '\frac{\bar{X} - \mu}{\sigma/\sqrt{n}} \stackrel{d}{\to} \mathcal{N}(0,1)' },
      { 'name': 'Chi-Square Test Statistic', 'formula': '\chi^2 = \sum_{i=1}^{k} \frac{(O_i - E_i)^2}{E_i}' },
      { 'name': 'Student\'s t-Test Statistic', 'formula': 't = \frac{\bar{X} - \mu}{S/\sqrt{n}}' },
      { 'name': 'F-Test Statistic', 'formula': 'F = \frac{S_1^2}{S_2^2}' },
      { 'name': 'Covariance', 'formula': '\text{Cov}(X,Y) = \mathbb{E}[(X - \mu_X)(Y - \mu_Y)]' },
      { 'name': 'Expected Value', 'formula': '\mathbb{E}[X] = \sum x P(X=x)' },
      { 'name': 'Entropy', 'formula': 'H(X) = -\sum P(x) \log_2 P(x)' }
    ]
  },
  {
    'name': 'Number Theory',
    'items': [
      { 'name': 'Euclidean Algorithm', 'formula': '\gcd(a,b) = \gcd(b, a \mod b)' },
      { 'name': 'Fermat\'s Little Theorem', 'formula': 'a^{p-1} \equiv 1 \pmod{p}' },
      { 'name': 'Euler\'s Totient Function', 'formula': '\phi(n) = n \prod_{p|n} \left(1 - \frac{1}{p}\right)' },
      { 'name': 'Chinese Remainder Theorem', 'formula': 'x \equiv a_i \pmod{m_i} \implies x \equiv a_1 M_1 y_1 + a_2 M_2 y_2 + \cdots + a_k M_k y_k \pmod{M}' },
      { 'name': 'Riemann Zeta Function', 'formula': '\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s}' },
      { 'name': 'Prime Number Theorem', 'formula': '\pi(n) \sim \frac{n}{\log n}' },
      { 'name': 'Goldbach Conjecture', 'formula': '\text{Every even integer} \geq 4 \text{ is the sum of two primes}' },
      { 'name': 'Dirichlet Series', 'formula': '\sum_{n=1}^{\infty} \frac{a_n}{n^s}' },
      { 'name': 'Modular Arithmetic', 'formula': 'a \equiv b \pmod{m} \iff m | (a - b)' },
      { 'name': 'Perfect Number', 'formula': '\sigma(n) = 2n' }
    ]
  },
  {
    'name': 'Complex Analysis',
    'items': [
      { 'name': 'Cauchy-Riemann Equations', 'formula': '\frac{\partial u}{\partial x} = \frac{\partial v}{\partial y}, \quad \frac{\partial u}{\partial y} = -\frac{\partial v}{\partial x}' },
      { 'name': 'Cauchy\'s Integral Formula', 'formula': 'f(a) = \frac{1}{2\pi i} \oint_C \frac{f(z)}{z - a} dz' },
      { 'name': 'Residue Theorem', 'formula': '\oint_C f(z) dz = 2\pi i \sum_{k=1}^{n} \text{Res}(f, z_k)' },
      { 'name': 'Laurent Series', 'formula': 'f(z) = \sum_{n=-\infty}^{\infty} a_n (z - z_0)^n' },
      { 'name': 'Argument Principle', 'formula': '\frac{1}{2\pi i} \oint_C \frac{f\'(z)}{f(z)} dz = N - P' },
      { 'name': 'Liouville\'s Theorem', 'formula': '\text{Bounded entire functions are constant}' },
      { 'name': 'Maximum Modulus Principle', 'formula': '|f(z)| \leq \max_{z \in \partial D} |f(z)|' },
      { 'name': 'Schwarz Lemma', 'formula': '|f(z)| \leq |z|, \quad |f\'(0)| \leq 1' },
      { 'name': 'Möbius Transformation', 'formula': 'f(z) = \frac{az + b}{cz + d}' },
      { 'name': 'Jensen\'s Formula', 'formula': '\log |f(0)| = \frac{1}{2\pi} \int_{0}^{2\pi} \log |f(re^{i\theta})| d\theta - \sum_{|a_n| < r} \log \frac{r}{|a_n|}' }
    ]
  },
  {
    'name': 'Differential Geometry',
    'items': [
      { 'name': 'Metric Tensor', 'formula': 'ds^2 = g_{\mu\nu} dx^\mu dx^\nu' },
      { 'name': 'Christoffel Symbols', 'formula': '\Gamma^\mu_{\nu\rho} = \frac{1}{2} g^{\mu\sigma} \left(\frac{\partial g_{\sigma\nu}}{\partial x^\rho} + \frac{\partial g_{\sigma\rho}}{\partial x^\nu} - \frac{\partial g_{\nu\rho}}{\partial x^\sigma}\right)' },
      { 'name': 'Riemann Curvature Tensor', 'formula': 'R^\rho_{\sigma\mu\nu} = \frac{\partial \Gamma^\rho_{\sigma\nu}}{\partial x^\mu} - \frac{\partial \Gamma^\rho_{\sigma\mu}}{\partial x^\nu} + \Gamma^\rho_{\mu\lambda} \Gamma^\lambda_{\sigma\nu} - \Gamma^\rho_{\nu\lambda} \Gamma^\lambda_{\sigma\mu}' },
      { 'name': 'Ricci Tensor', 'formula': 'R_{\mu\nu} = R^\rho_{\mu\rho\nu}' },
      { 'name': 'Scalar Curvature', 'formula': 'R = g^{\mu\nu} R_{\mu\nu}' },
      { 'name': 'Gauss-Codazzi Equations', 'formula': 'R_{\alpha\beta\gamma\delta} = R_{\alpha\beta\gamma\delta} + K (h_{\alpha\gamma} h_{\beta\delta} - h_{\alpha\delta} h_{\beta\gamma})' },
      { 'name': 'Weingarten Equations', 'formula': '\partial_\alpha N^a = -h^a_{\alpha\beta} g^{\beta\gamma} \partial_\gamma x^a' },
      { 'name': 'Gauss-Bonnet Theorem', 'formula': '\iint_M K dA = 2\pi \chi(M)' },
      { 'name': 'First Fundamental Form', 'formula': 'I = E du^2 + 2F du dv + G dv^2' },
      { 'name': 'Second Fundamental Form', 'formula': 'II = L du^2 + 2M du dv + N dv^2' }
    ]
  },
  {
    'name': 'Topology',
    'items': [
      { 'name': 'Brouwer Fixed Point Theorem', 'formula': '\text{Every continuous map } f: D^n \to D^n \text{ has a fixed point}' },
      { 'name': 'Euler Characteristic', 'formula': '\chi = V - E + F' },
      { 'name': 'Homotopy Group', 'formula': '\pi_n(X,x_0) = [S^n, X]_{x_0}' },
      { 'name': 'Homology Group', 'formula': 'H_n(X) = \ker \partial_n / \text{im } \partial_{n+1}' },
      { 'name': 'Lefschetz Fixed Point Theorem', 'formula': 'L(f) = \sum (-1)^n \text{tr}(f_*: H_n(X) \to H_n(X))' },
      { 'name': 'Mayer-Vietoris Sequence', 'formula': '\cdots \to H_n(A \cap B) \to H_n(A) \oplus H_n(B) \to H_n(A \cup B) \to H_{n-1}(A \cap B) \to \cdots' },
      { 'name': 'Topological Degree', 'formula': '\deg(f) = \sum_{y \in f^{-1}(z)} \text{sgn} Df(y)' },
      { 'name': 'Compact Hausdorff Space', 'formula': '\text{A space is compact Hausdorff iff it is Tychonoff and Lindelöf}' },
      { 'name': 'Manifold', 'formula': '\text{A topological space locally homeomorphic to } \mathbb{R}^n' },
      { 'name': 'Connected Component', 'formula': '\pi_0(X) = \text{set of connected components of } X' }
    ]
  },
  {
    'name': 'Relativity',
    'items': [
      { 'name': 'Special Relativity', 'formula': '\Delta s^2 = c^2 \Delta t^2 - \Delta x^2 - \Delta y^2 - \Delta z^2' },
      { 'name': 'Lorentz Transformation', 'formula': 'x\' = \gamma(x - vt), \quad t\' = \gamma(t - vx/c^2)' },
      { 'name': 'Time Dilation', 'formula': '\Delta t = \gamma \Delta t_0' },
      { 'name': 'Length Contraction', 'formula': 'L = L_0 / \gamma' },
      { 'name': 'Einstein Field Equations', 'formula': 'G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4} T_{\mu\nu}' },
      { 'name': 'Energy-Momentum Tensor', 'formula': 'T_{\mu\nu} = (\rho + p/c^2) u_\mu u_\nu + p g_{\mu\nu}' },
      { 'name': 'Schwarzschild Metric', 'formula': 'ds^2 = \left(1 - \frac{2GM}{c^2 r}\right) c^2 dt^2 - \left(1 - \frac{2GM}{c^2 r}\right)^{-1} dr^2 - r^2 d\Omega^2' },
      { 'name': 'Friedmann Equations', 'formula': '\left(\frac{\dot{a}}{a}\right)^2 = \frac{8\pi G}{3} \rho - \frac{kc^2}{a^2} + \frac{\Lambda c^2}{3}' },
      { 'name': 'Hubble\'s Law', 'formula': 'v = H_0 d' },
      { 'name': 'Gravitational Lensing', 'formula': '\theta = \frac{4GM}{c^2 b}' }
    ]
  },
  {
    'name': 'Quantum Mechanics',
    'items': [
      { 'name': 'Time-Dependent Schrödinger Equation', 'formula': 'i\hbar \frac{\partial \Psi}{\partial t} = \hat{H} \Psi' },
      { 'name': 'Time-Independent Schrödinger Equation', 'formula': '\hat{H} \psi = E \psi' },
      { 'name': 'Heisenberg Uncertainty Principle', 'formula': '\Delta x \Delta p \geq \frac{\hbar}{2}' },
      { 'name': 'Pauli Exclusion Principle', 'formula': '\Psi(x_1,x_2) = -\Psi(x_2,x_1)' },
      { 'name': 'Commutation Relation', 'formula': '[\hat{x}, \hat{p}] = i\hbar' },
      { 'name': 'Dirac Equation', 'formula': '\left(i\gamma^\mu \partial_\mu - \frac{m c}{\hbar}\right) \psi = 0' },
      { 'name': 'Bra-Ket Notation', 'formula': '\langle \phi | \psi \rangle = \int \phi^*(x) \psi(x) dx' },
      { 'name': 'Expectation Value', 'formula': '\langle A \rangle = \langle \psi | \hat{A} | \psi \rangle' },
      { 'name': 'Density Matrix', 'formula': '\rho = \sum_i p_i |\psi_i \rangle \langle \psi_i|' },
      { 'name': 'Born Rule', 'formula': 'P(a) = |\langle a | \psi \rangle|^2' }
    ]
  },
  {
    'name': 'Information Theory',
    'items': [
      { 'name': 'Shannon Entropy', 'formula': 'H(X) = -\sum_{x} p(x) \log_2 p(x)' },
      { 'name': 'Joint Entropy', 'formula': 'H(X,Y) = -\sum_{x,y} p(x,y) \log_2 p(x,y)' },
      { 'name': 'Conditional Entropy', 'formula': 'H(Y|X) = -\sum_{x,y} p(x,y) \log_2 p(y|x)' },
      { 'name': 'Mutual Information', 'formula': 'I(X;Y) = H(X) + H(Y) - H(X,Y)' },
      { 'name': 'Relative Entropy', 'formula': 'D_{KL}(P||Q) = \sum_{x} P(x) \log_2 \frac{P(x)}{Q(x)}' },
      { 'name': 'Channel Capacity', 'formula': 'C = \max_{P(X)} I(X;Y)' },
      { 'name': 'Noiseless Coding Theorem', 'formula': 'H(X) \leq L < H(X) + 1' },
      { 'name': 'Noisy Coding Theorem', 'formula': '\text{Reliable communication possible iff } R < C' },
      { 'name': 'Typical Set', 'formula': '|T_\epsilon^n(X)| \approx 2^{nH(X)}' },
      { 'name': 'Rate-Distortion Function', 'formula': 'R(D) = \min_{p(\hat{x}|x): E[d(X,\hat{X})] \leq D} I(X;\hat{X})' }
    ]
  },
  {
    'name': 'Graph Theory',
    'items': [
      { 'name': 'Handshaking Lemma', 'formula': '\sum_{v \in V} deg(v) = 2|E|' },
      { 'name': 'Eulerian Circuit', 'formula': '\text{All vertices have even degree}' },
      { 'name': 'Hamiltonian Path', 'formula': '\text{A path that visits each vertex exactly once}' },
      { 'name': 'Graph Isomorphism', 'formula': 'G \cong H \iff \exists \text{bijection } f: V(G) \to V(H) \text{ preserving adjacency}' },
      { 'name': 'Matrix Tree Theorem', 'formula': '\tau(G) = \det(L[1][1])' },
      { 'name': 'Chromatic Number', 'formula': '\chi(G) = \min k : G \text{ is } k\text{-colorable}' },
      { 'name': 'Clique Number', 'formula': '\omega(G) = \max |K| : K \subseteq V(G) \text{ is a clique}' },
      { 'name': 'Independence Number', 'formula': '\alpha(G) = \max |I| : I \subseteq V(G) \text{ is independent}' },
      { 'name': 'Planar Graph', 'formula': '|V| - |E| + |F| = 2' },
      { 'name': 'Bipartite Graph', 'formula': '\chi(G) \leq 2' }
    ]
  },
  {
    'name': 'Machine Learning',
    'items': [
      { 'name': 'Linear Regression', 'formula': 'y = \mathbf{w}^T \mathbf{x} + b' },
      { 'name': 'Logistic Regression', 'formula': '\sigma(z) = \frac{1}{1 + e^{-z}}' },
      { 'name': 'Mean Squared Error', 'formula': 'MSE = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2' },
      { 'name': 'Cross Entropy Loss', 'formula': 'CE = -\frac{1}{n} \sum_{i=1}^{n} [y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i)]' },
      { 'name': 'Gradient Descent', 'formula': '\mathbf{w} = \mathbf{w} - \eta \nabla L(\mathbf{w})' },
      { 'name': 'Softmax Function', 'formula': '\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_{j=1}^{k} e^{z_j}}' },
      { 'name': 'Convolution Operation', 'formula': '(f * g)(x) = \int f(\tau) g(x - \tau) d\tau' },
      { 'name': 'Backpropagation', 'formula': '\frac{\partial L}{\partial w_{ij}} = \frac{\partial L}{\partial a_i} \cdot \frac{\partial a_i}{\partial z_i} \cdot \frac{\partial z_i}{\partial w_{ij}}' },
      { 'name': 'PCA Objective', 'formula': '\max_{\mathbf{w}} \mathbf{w}^T \mathbf{C} \mathbf{w} \quad \text{s.t. } \mathbf{w}^T \mathbf{w} = 1' },
      { 'name': 'K-Means Objective', 'formula': '\min_{\mathbf{c}} \sum_{i=1}^{n} \min_{j=1}^{k} \|\mathbf{x}_i - \mathbf{c}_j\|^2' }
    ]
  },
  {
    'name': 'Combinatorics',
    'items': [
      { 'name': 'Permutations', 'formula': 'P(n,k) = \frac{n!}{(n-k)!}' },
      { 'name': 'Combinations', 'formula': '\binom{n}{k} = \frac{n!}{k!(n-k)!}' },
      { 'name': 'Pascal\'s Identity', 'formula': '\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}' },
      { 'name': 'Inclusion-Exclusion Principle', 'formula': '|A_1 \cup A_2 \cup \cdots \cup A_n| = \sum |A_i| - \sum |A_i \cap A_j| + \cdots + (-1)^{n+1} |A_1 \cap \cdots \cap A_n|' },
      { 'name': 'Stars and Bars Theorem', 'formula': '\binom{n+k-1}{k-1}' },
      { 'name': 'Catalan Numbers', 'formula': 'C_n = \frac{1}{n+1} \binom{2n}{n}' },
      { 'name': 'Binomial Coefficient Identity', 'formula': '\sum_{k=0}^{n} \binom{n}{k} = 2^n' },
      { 'name': 'Vandermonde\'s Identity', 'formula': '\binom{m+n}{k} = \sum_{i=0}^{k} \binom{m}{i} \binom{n}{k-i}' },
      { 'name': 'Multinomial Coefficient', 'formula': '\binom{n}{k_1,k_2,\ldots,k_m} = \frac{n!}{k_1!k_2!\ldots k_m!}' },
      { 'name': 'Bell Numbers', 'formula': 'B_n = \sum_{k=0}^{n} S(n,k)' }
    ]
  },
  {
    'name': 'Optimization',
    'items': [
      { 'name': 'Lagrange Multiplier', 'formula': '\nabla f(x) = \lambda \nabla g(x)' },
      { 'name': 'Karush-Kuhn-Tucker Conditions', 'formula': '\nabla f(x) + \sum_{i=1}^{m} \lambda_i \nabla g_i(x) + \sum_{j=1}^{n} \mu_j \nabla h_j(x) = 0' },
      { 'name': 'Convex Function Definition', 'formula': 'f(tx + (1-t)y) \leq tf(x) + (1-t)f(y) \quad \forall t \in [0,1]' },
      { 'name': 'Jensen\'s Inequality', 'formula': 'f(\mathbb{E}[X]) \leq \mathbb{E}[f(X)]' },
      { 'name': 'Cauchy-Schwarz Inequality', 'formula': '(\mathbf{a} \cdot \mathbf{b})^2 \leq (\mathbf{a} \cdot \mathbf{a})(\mathbf{b} \cdot \mathbf{b})' },
      { 'name': 'Triangle Inequality', 'formula': '\|\mathbf{a} + \mathbf{b}\| \leq \|\mathbf{a}\| + \|\mathbf{b}\|' },
      { 'name': 'AM-GM Inequality', 'formula': '\frac{a_1 + a_2 + \cdots + a_n}{n} \geq \sqrt[n]{a_1 a_2 \cdots a_n}' },
      { 'name': 'Quadratic Programming', 'formula': '\min_{\mathbf{x}} \frac{1}{2} \mathbf{x}^T Q \mathbf{x} + \mathbf{c}^T \mathbf{x} \quad \text{s.t. } A \mathbf{x} \leq b' },
      { 'name': 'Newton\'s Method', 'formula': 'x_{n+1} = x_n - \frac{f(x_n)}{f\'\'(x_n)}' },
      { 'name': 'KKT Complementary Slackness', 'formula': '\lambda_i g_i(x) = 0 \quad \forall i' }
    ]
  },
  {
    'name': 'Game Theory',
    'items': [
      { 'name': 'Nash Equilibrium', 'formula': 'u_i(s_i^*, s_{-i}^*) \geq u_i(s_i, s_{-i}^*) \quad \forall s_i \in S_i' },
      { 'name': 'Minimax Theorem', 'formula': '\min_{y} \max_{x} x^T A y = \max_{x} \min_{y} x^T A y' },
      { 'name': 'Prisoner\'s Dilemma', 'formula': '\text{Payoff matrix: } \begin{pmatrix} (R,R) & (S,T) \\ (T,S) & (P,P) \end{pmatrix}' },
      { 'name': 'Shapley Value', 'formula': '\phi_i(v) = \sum_{S \subseteq N\\{i\}} \frac{|S|!(n - |S| - 1)!}{n!} [v(S \cup \{i\}) - v(S)]' },
      { 'name': 'Coase Theorem', 'formula': '\text{Efficient outcome regardless of property rights}' },
      { 'name': 'Zero-Sum Game', 'formula': 'u_1(s) + u_2(s) = 0 \quad \forall s \in S' },
      { 'name': 'Mixed Strategy', 'formula': '\sigma_i \in \Delta(S_i) = \{p \in \mathbb{R}^{|S_i|} : p_j \geq 0, \sum p_j = 1\}' },
      { 'name': 'Subgame Perfect Equilibrium', 'formula': '\text{Nash equilibrium in every subgame}' },
      { 'name': 'Evolutionarily Stable Strategy', 'formula': 'u(x,x) \geq u(y,x) \quad \forall y \neq x' },
      { 'name': 'Bayesian Nash Equilibrium', 'formula': '\text{Nash equilibrium with incomplete information}' }
    ]
  },
  {
    'name': 'Fluid Dynamics',
    'items': [
      { 'name': 'Continuity Equation', 'formula': '\frac{\partial \rho}{\partial t} + \nabla \cdot (\rho \mathbf{u}) = 0' },
      { 'name': 'Navier-Stokes Equation', 'formula': '\rho \left(\frac{\partial \mathbf{u}}{\partial t} + \mathbf{u} \cdot \nabla \mathbf{u}\right) = -\nabla p + \mu \nabla^2 \mathbf{u} + \mathbf{f}' },
      { 'name': 'Bernoulli\'s Equation', 'formula': 'p + \frac{1}{2} \rho v^2 + \rho g h = \text{constant}' },
      { 'name': 'Reynolds Number', 'formula': 'Re = \frac{\rho v L}{\mu}' },
      { 'name': 'Euler Equation', 'formula': '\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} = -\frac{1}{\rho} \nabla p' },
      { 'name': 'Stream Function', 'formula': '\mathbf{u} = \nabla \times (\psi \mathbf{e}_z)' },
      { 'name': 'Vorticity Equation', 'formula': '\frac{\partial \omega}{\partial t} + (\mathbf{u} \cdot \nabla) \omega = (\omega \cdot \nabla) \mathbf{u} + \nu \nabla^2 \omega' },
      { 'name': 'Stokes Flow', 'formula': '\nabla p = \mu \nabla^2 \mathbf{u}' },
      { 'name': 'Drag Coefficient', 'formula': 'C_D = \frac{2F_D}{\rho v^2 A}' },
      { 'name': 'Lift Coefficient', 'formula': 'C_L = \frac{2F_L}{\rho v^2 A}' }
    ]
  },
  {
    'name': 'Thermodynamics',
    'items': [
      { 'name': 'First Law of Thermodynamics', 'formula': '\Delta U = Q - W' },
      { 'name': 'Second Law of Thermodynamics', 'formula': '\Delta S_{universe} \geq 0' },
      { 'name': 'Third Law of Thermodynamics', 'formula': '\lim_{T \to 0} S = 0' },
      { 'name': 'Entropy Change', 'formula': '\Delta S = \int \frac{dQ_{rev}}{T}' },
      { 'name': 'Gibbs Free Energy', 'formula': 'G = H - TS' },
      { 'name': 'Helmholtz Free Energy', 'formula': 'A = U - TS' },
      { 'name': 'Ideal Gas Law', 'formula': 'PV = nRT' },
      { 'name': 'Carnot Efficiency', 'formula': '\eta_{Carnot} = 1 - \frac{T_C}{T_H}' },
      { 'name': 'Clausius-Clapeyron Equation', 'formula': '\frac{dP}{dT} = \frac{\Delta H_{vap}}{T \Delta V_{vap}}' },
      { 'name': 'Maxwell Relations', 'formula': '\left(\frac{\partial T}{\partial V}\right)_S = -\left(\frac{\partial P}{\partial S}\right)_V' }
    ]
  },
  {
    'name': 'Cryptography',
    'items': [
      { 'name': 'RSA Encryption', 'formula': 'c = m^e \mod n' },
      { 'name': 'RSA Decryption', 'formula': 'm = c^d \mod n' },
      { 'name': 'Diffie-Hellman Key Exchange', 'formula': 'g^{ab} \mod p' },
      { 'name': 'ElGamal Encryption', 'formula': '(g^k, m \cdot y^k) \mod p' },
      { 'name': 'AES S-Box', 'formula': 'S(x) = x^{-1} \oplus \text{AffineTransform}(x)' },
      { 'name': 'SHA-256 Compression', 'formula': 'H_i = H_{i-1} + 	ext{Ch}(E, F, G) + Sigma_1(E) + W_i + K_i' },
      { 'name': 'Rabin Cryptosystem', 'formula': 'c = m^2 \mod n' },
      { 'name': 'Elliptic Curve Addition', 'formula': 'P + Q = R' },
      { 'name': 'Blowfish Encryption', 'formula': 'y = P_{17} + (\text{Feistel}(P_{1} + x \mod 2^{32}) \oplus P_{18})' },
      { 'name': 'Vigenère Cipher', 'formula': 'C_i = (P_i + K_i) \mod 26' }
    ]
  },
  {
    'name': 'Numerical Analysis',
    'items': [
      { 'name': 'Taylor Series Approximation', 'formula': 'f(x+h) = f(x) + hf\'(x) + \frac{h^2}{2}f\'\'(x) + \cdots' },
      { 'name': 'Newton-Raphson Method', 'formula': 'x_{n+1} = x_n - \frac{f(x_n)}{f\'(x_n)}' },
      { 'name': 'Bisection Method', 'formula': 'c = \frac{a + b}{2}' },
      { 'name': 'Trapezoidal Rule', 'formula': '\int_a^b f(x) dx \approx \frac{b-a}{2}[f(a) + f(b)]' },
      { 'name': 'Simpson\'s Rule', 'formula': '\int_a^b f(x) dx \approx \frac{b-a}{6}[f(a) + 4f(\frac{a+b}{2}) + f(b)]' },
      { 'name': 'Euler\'s Method', 'formula': 'y_{n+1} = y_n + hf(t_n, y_n)' },
      { 'name': 'Runge-Kutta Method', 'formula': 'y_{n+1} = y_n + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)' },
      { 'name': 'Finite Difference Approximation', 'formula': 'f\'(x) \approx \frac{f(x+h) - f(x)}{h}' },
      { 'name': 'Gaussian Elimination', 'formula': '\text{Reduce } A\mathbf{x} = \mathbf{b} \text{ to row-echelon form}' },
      { 'name': 'Lagrange Interpolation', 'formula': 'L(x) = \sum_{i=0}^{n} y_i \prod_{j=0,j\neq i}^{n} \frac{x - x_j}{x_i - x_j}' }
    ]
  }
];
